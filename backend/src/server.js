import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ message: "Backend funcionando" });
});

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
