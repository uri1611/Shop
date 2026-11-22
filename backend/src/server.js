import express from "express";
import multer from "multer";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import adminRoutes from "./routes/admin.js";
import cartRoutes from "./routes/cart.js";
import checkoutRoutes from "./routes/checkout.js";
import orderRoutes from "./routes/orders.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import { UPLOADS_DIR } from "./upload.js";

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el archivo .env");
  process.exit(1);
}

// Sin clave de Stripe la tienda funciona, pero el checkout va a fallar.
if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ||
    process.env.STRIPE_SECRET_KEY === "sk_test_reemplazar") {
  console.warn("Aviso: STRIPE_SECRET_KEY no está configurada. El checkout no va a funcionar.");
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Las imágenes subidas se sirven como archivos estáticos:
// backend/uploads/abc.jpg  ->  http://localhost:3000/uploads/abc.jpg
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/api/health", (_req, res) => {
  res.json({ message: "Backend funcionando" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// Carrito, checkout y órdenes son solo para usuarios logueados.
app.use("/api/cart", requireAuth, cartRoutes);
app.use("/api/checkout", requireAuth, checkoutRoutes);
app.use("/api/orders", requireAuth, orderRoutes);

// Todo /api/admin pasa primero por requireAuth (¿hay sesión?)
// y después por requireAdmin (¿es ADMIN?). La protección real está acá,
// en el backend; ocultar el link en el frontend es solo cosmético.
app.use("/api/admin", requireAuth, requireAdmin, adminRoutes);

// Cualquier otra ruta /api que no exista.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejo central de errores. Express 5 manda acá los errores
// de las rutas async, así siempre respondemos { error: "..." }.
app.use((error, _req, res, _next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El body no es un JSON válido" });
  }

  // Errores de multer al subir archivos (ej: archivo demasiado grande).
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "La imagen no puede pesar más de 5 MB"
        : "No se pudo procesar el archivo";
    return res.status(400).json({ error: message });
  }

  // Errores que nosotros creamos con un status (ej: tipo de imagen inválido).
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error(error);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
