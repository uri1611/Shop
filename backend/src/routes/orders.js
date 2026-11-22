import { Router } from "express";
import prisma from "../db.js";

// Protegidas en server.js con requireAuth.
// Regla clave: SIEMPRE se filtra por el userId del token.
const router = Router();

// GET /api/orders  -> las órdenes del usuario, de la más nueva a la más vieja
router.get("/", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    })),
  });
});

// GET /api/orders/:id  -> detalle de UNA orden del usuario
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  // findFirst con id Y userId: si la orden existe pero es de otro usuario,
  // no la encuentra y respondemos 404 (no 403), así ni siquiera
  // revelamos que esa orden existe.
  const order = Number.isInteger(id)
    ? await prisma.order.findFirst({
        where: { id, userId: req.user.id },
        include: { items: { orderBy: { id: "asc" } } },
      })
    : null;

  if (!order) {
    return res.status(404).json({ error: "Orden no encontrada" });
  }

  res.json({
    order: {
      id: order.id,
      status: order.status,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      // Nombre y precio son la COPIA guardada al comprar, no los actuales.
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        subtotalCents: item.unitPriceCents * item.quantity,
      })),
    },
  });
});

export default router;
