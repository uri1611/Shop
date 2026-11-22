import { Router } from "express";
import prisma from "../db.js";
import { deleteUploadedFile, uploadImage } from "../upload.js";

// Todas estas rutas quedan protegidas en server.js con
// requireAuth + requireAdmin, así que acá ya sabemos que es un ADMIN.
const router = Router();

// Lo que el panel ve de un producto: a diferencia del catálogo,
// incluye isActive y las fechas.
function adminProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    isActive: product.isActive,
    imageUrl: product.imageFilename ? `/uploads/${product.imageFilename}` : null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

// Valida los campos de un producto que vienen en el body.
// - Al crear (partial = false) todos los campos son obligatorios.
// - Al editar (partial = true) solo se validan los que vienen.
// Devuelve { error } si algo está mal, o { data } con los campos limpios.
function readProductInput(body = {}, { partial }) {
  const data = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return { error: "El nombre es obligatorio" };
    }
    data.name = body.name.trim();
  }

  if (!partial || body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      return { error: "La descripción es obligatoria" };
    }
    data.description = body.description.trim();
  }

  if (!partial || body.priceCents !== undefined) {
    // El precio va en centavos: tiene que ser un entero mayor a 0.
    if (!Number.isInteger(body.priceCents) || body.priceCents <= 0) {
      return { error: "El precio debe ser un número entero de centavos mayor a 0" };
    }
    data.priceCents = body.priceCents;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return { error: "isActive debe ser true o false" };
    }
    data.isActive = body.isActive;
  }

  return { data };
}

// Busca un producto por el :id de la URL. Devuelve null si no existe.
async function findProduct(idParam) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  return prisma.product.findUnique({ where: { id } });
}

// GET /api/admin/products  -> todos, activos e inactivos
router.get("/products", async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { id: "asc" } });
  res.json({ products: products.map(adminProduct) });
});

// GET /api/admin/products/:id  -> para cargar el formulario de edición
router.get("/products/:id", async (req, res) => {
  const product = await findProduct(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  res.json({ product: adminProduct(product) });
});

// POST /api/admin/products
router.post("/products", async (req, res) => {
  const { data, error } = readProductInput(req.body, { partial: false });

  if (error) {
    return res.status(400).json({ error });
  }

  const product = await prisma.product.create({ data });
  res.status(201).json({ product: adminProduct(product) });
});

// PATCH /api/admin/products/:id
// No hay DELETE: para "borrar" un producto se manda isActive = false.
router.patch("/products/:id", async (req, res) => {
  const product = await findProduct(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const { data, error } = readProductInput(req.body, { partial: true });

  if (error) {
    return res.status(400).json({ error });
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data,
  });

  res.json({ product: adminProduct(updated) });
});

// POST /api/admin/products/:id/image
// Recibe un multipart/form-data con el archivo en el campo "image".
// uploadImage (multer) valida tipo y tamaño y guarda el archivo en disco.
router.post("/products/:id/image", uploadImage, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Tenés que elegir una imagen" });
  }

  const product = await findProduct(req.params.id);

  if (!product) {
    // El archivo ya se guardó: lo borramos para no dejar basura.
    deleteUploadedFile(req.file.filename);
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  // En la base guardamos solo el nombre del archivo, no la imagen.
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { imageFilename: req.file.filename },
  });

  // La imagen anterior ya no la usa nadie.
  deleteUploadedFile(product.imageFilename);

  res.json({ product: adminProduct(updated) });
});

export default router;
