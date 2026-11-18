import { Router } from "express";
import prisma from "../db.js";

const router = Router();

// Lo que el catálogo público muestra de un producto.
// En vez del nombre del archivo, devolvemos la URL lista para usar en <img>.
function publicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    imageUrl: product.imageFilename ? `/uploads/${product.imageFilename}` : null,
  };
}

// GET /api/products?search=texto
// Solo productos activos. Si viene "search", filtra por nombre.
router.get("/", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      // Si search está vacío no filtramos por nombre.
      ...(search && { name: { contains: search } }),
    },
    orderBy: { name: "asc" },
  });

  res.json({ products: products.map(publicProduct) });
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  // Si el id no es un número entero, el producto no puede existir.
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const product = await prisma.product.findUnique({ where: { id } });

  // Un producto inactivo se trata igual que uno inexistente.
  if (!product || !product.isActive) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  res.json({ product: publicProduct(product) });
});

export default router;
