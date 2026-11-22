import { Router } from "express";
import prisma from "../db.js";

// Todas estas rutas quedan protegidas en server.js con requireAuth,
// así que req.user siempre es el usuario logueado.
// El carrito de cada usuario se busca SIEMPRE por req.user.id:
// nunca se recibe un userId desde el frontend.
const router = Router();

// Regla de negocio: cantidad por producto entre 1 y 99.
const MAX_QUANTITY = 99;

// Arma la respuesta del carrito con precios sacados de la BASE DE DATOS.
// El frontend nunca manda precios: solo productId y quantity.
// Si un producto se desactivó después de agregarlo, se muestra como
// "no disponible" y no suma al total.
async function buildCart(userId) {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { id: "asc" },
  });

  const items = cartItems.map(({ product, quantity }) => ({
    productId: product.id,
    name: product.name,
    imageUrl: product.imageFilename ? `/uploads/${product.imageFilename}` : null,
    unitPriceCents: product.priceCents,
    quantity,
    subtotalCents: product.priceCents * quantity,
    available: product.isActive,
  }));

  const totalCents = items
    .filter((item) => item.available)
    .reduce((sum, item) => sum + item.subtotalCents, 0);

  return { items, totalCents };
}

// Valida que sea un entero entre 1 y MAX_QUANTITY.
function isValidQuantity(quantity) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY;
}

// GET /api/cart
router.get("/", async (req, res) => {
  res.json(await buildCart(req.user.id));
});

// POST /api/cart/items   body: { productId, quantity }
// Si el producto ya está en el carrito, suma la cantidad.
router.post("/items", async (req, res) => {
  const { productId, quantity = 1 } = req.body ?? {};

  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "productId inválido" });
  }

  if (!isValidQuantity(quantity)) {
    return res
      .status(400)
      .json({ error: `La cantidad debe ser entre 1 y ${MAX_QUANTITY}` });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });

  // No se pueden agregar productos inexistentes ni inactivos.
  if (!product || !product.isActive) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const userId = req.user.id;
  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  const newQuantity = (existing?.quantity ?? 0) + quantity;

  if (newQuantity > MAX_QUANTITY) {
    return res
      .status(400)
      .json({ error: `No podés tener más de ${MAX_QUANTITY} unidades de un producto` });
  }

  // upsert = "update si existe, create si no".
  // Funciona gracias al @@unique([userId, productId]) del schema.
  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: newQuantity },
    create: { userId, productId, quantity: newQuantity },
  });

  res.status(201).json(await buildCart(userId));
});

// PATCH /api/cart/items/:productId   body: { quantity }
// Reemplaza la cantidad (no la suma).
router.patch("/items/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  const { quantity } = req.body ?? {};
  const userId = req.user.id;

  if (!isValidQuantity(quantity)) {
    return res
      .status(400)
      .json({ error: `La cantidad debe ser entre 1 y ${MAX_QUANTITY}` });
  }

  const item = Number.isInteger(productId)
    ? await prisma.cartItem.findUnique({
        where: { userId_productId: { userId, productId } },
        include: { product: true },
      })
    : null;

  if (!item) {
    return res.status(404).json({ error: "El producto no está en tu carrito" });
  }

  if (!item.product.isActive) {
    return res.status(400).json({ error: "Este producto ya no está disponible" });
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });

  res.json(await buildCart(userId));
});

// DELETE /api/cart/items/:productId
router.delete("/items/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  const userId = req.user.id;

  // deleteMany filtrando por userId: aunque alguien mande el productId
  // de otro, solo puede borrar de SU carrito.
  const { count } = Number.isInteger(productId)
    ? await prisma.cartItem.deleteMany({ where: { userId, productId } })
    : { count: 0 };

  if (count === 0) {
    return res.status(404).json({ error: "El producto no está en tu carrito" });
  }

  res.json(await buildCart(userId));
});

export default router;
