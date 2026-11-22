import { Router } from "express";
import prisma from "../db.js";
import stripe from "../stripe.js";

// Protegidas en server.js con requireAuth.
//
// Flujo completo:
// 1. POST /api/checkout          -> crea la orden PENDING y la sesión de Stripe,
//                                   devuelve la URL de pago de Stripe.
// 2. El usuario paga en la página de Stripe (tarjeta de test 4242...).
// 3. Stripe lo devuelve a /checkout/success?session_id=... (frontend).
// 4. POST /api/checkout/confirm  -> le preguntamos a Stripe si se pagó.
//                                   Si sí: orden PAID y se vacía el carrito.
// Si el usuario cancela en Stripe, vuelve a /checkout/cancel?order_id=...
// y el frontend llama a POST /api/checkout/cancel.
const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// POST /api/checkout
router.post("/", async (req, res) => {
  const userId = req.user.id;

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });

  if (cartItems.length === 0) {
    return res.status(400).json({ error: "Tu carrito está vacío" });
  }

  // No se puede comprar un producto que se desactivó mientras estaba en el carrito.
  if (cartItems.some((item) => !item.product.isActive)) {
    return res
      .status(400)
      .json({ error: "Tu carrito tiene productos que ya no están disponibles. Quitalos para continuar." });
  }

  // Precios y total salen de la BASE DE DATOS, en centavos.
  const totalCents = cartItems.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );

  // 1) Creamos la orden PENDING con una COPIA del nombre y precio de cada
  //    producto. Si después el admin cambia el precio, la orden no cambia.
  const order = await prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      totalCents,
      items: {
        create: cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          unitPriceCents: item.product.priceCents,
          quantity: item.quantity,
        })),
      },
    },
  });

  // 2) Creamos la sesión de pago en Stripe con los MISMOS precios.
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cartItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.product.priceCents, // Stripe también usa centavos
          product_data: { name: item.product.name },
        },
      })),
      // Stripe reemplaza {CHECKOUT_SESSION_ID} por el id real de la sesión.
      success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/checkout/cancel?order_id=${order.id}`,
      metadata: { orderId: String(order.id) },
    });
  } catch (error) {
    // Stripe no respondió o rechazó la request (ej: clave mal configurada).
    console.error("Error creando la sesión de Stripe:", error.message);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    return res
      .status(502)
      .json({ error: "No se pudo iniciar el pago. Intentá de nuevo en unos minutos." });
  }

  // 3) Guardamos el id de la sesión para poder confirmarla a la vuelta.
  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  res.status(201).json({ url: session.url });
});

// POST /api/checkout/confirm   body: { sessionId }
// Es IDEMPOTENTE: llamarlo varias veces con la misma sesión da el mismo
// resultado y no duplica nada (no crea otra orden ni vacía dos veces).
router.post("/confirm", async (req, res) => {
  const { sessionId } = req.body ?? {};

  if (typeof sessionId !== "string" || !sessionId) {
    return res.status(400).json({ error: "Falta el id de la sesión de pago" });
  }

  // Filtramos también por userId: nadie puede confirmar la orden de otro.
  const order = await prisma.order.findFirst({
    where: { stripeSessionId: sessionId, userId: req.user.id },
  });

  if (!order) {
    return res.status(404).json({ error: "Orden no encontrada" });
  }

  // Si ya se procesó (PAID, CANCELLED o FAILED), no hacemos nada más.
  if (order.status !== "PENDING") {
    return res.json({ orderId: order.id, status: order.status });
  }

  // No le creemos al frontend que "se pagó": le preguntamos a Stripe.
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error("Error consultando la sesión de Stripe:", error.message);
    return res
      .status(502)
      .json({ error: "No se pudo verificar el pago. Intentá de nuevo en unos minutos." });
  }

  if (session.payment_status !== "paid") {
    // Todavía no se pagó: la orden sigue PENDING.
    return res.json({ orderId: order.id, status: order.status });
  }

  // Transacción: o se hacen las dos cosas, o ninguna.
  await prisma.$transaction(async (tx) => {
    // El "status: PENDING" en el where evita procesarla dos veces
    // si llegan dos confirmaciones al mismo tiempo.
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID" },
    });

    if (count === 1) {
      // Sacamos del carrito solo los productos que se compraron.
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      await tx.cartItem.deleteMany({
        where: {
          userId: req.user.id,
          productId: { in: items.map((item) => item.productId) },
        },
      });
    }
  });

  res.json({ orderId: order.id, status: "PAID" });
});

// POST /api/checkout/cancel   body: { orderId }
// El usuario volvió de Stripe sin pagar. El carrito queda intacto.
router.post("/cancel", async (req, res) => {
  const orderId = Number(req.body?.orderId);

  const order = Number.isInteger(orderId)
    ? await prisma.order.findFirst({ where: { id: orderId, userId: req.user.id } })
    : null;

  if (!order) {
    return res.status(404).json({ error: "Orden no encontrada" });
  }

  // Solo se cancela si sigue pendiente (idempotente, igual que confirm).
  if (order.status === "PENDING") {
    // Cerramos la sesión en Stripe para que ya no se pueda pagar.
    // Si falla (ej: ya expiró), no es grave: seguimos igual.
    if (order.stripeSessionId) {
      try {
        await stripe.checkout.sessions.expire(order.stripeSessionId);
      } catch (error) {
        console.error("No se pudo expirar la sesión de Stripe:", error.message);
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
  }

  res.json({ orderId: order.id, status: order.status === "PENDING" ? "CANCELLED" : order.status });
});

export default router;
