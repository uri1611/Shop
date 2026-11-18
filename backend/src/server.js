import express from "express";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el archivo .env");
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ message: "Backend funcionando" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

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

  console.error(error);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
