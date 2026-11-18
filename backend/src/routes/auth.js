import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// El token solo guarda el id del usuario. Expira a los 7 días.
function createToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// Lo que devolvemos al frontend sobre un usuario (nunca el passwordHash).
function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role };
}

// Lee email y password del body, normalizando el email.
function readCredentials(body = {}) {
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  return { email, password };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password } = readCredentials(req.body);

  if (!email.includes("@")) {
    return res.status(400).json({ error: "El email no es válido" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res.status(409).json({ error: "Ya existe un usuario con ese email" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // El rol NO se lee del body: todo registro público es CUSTOMER.
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "CUSTOMER" },
  });

  res.status(201).json({ token: createToken(user), user: publicUser(user) });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = readCredentials(req.body);

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email y contraseña son obligatorios" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user && (await bcrypt.compare(password, user.passwordHash));

  // Mismo mensaje si falla el email o la contraseña, para no revelar
  // qué emails están registrados.
  if (!passwordOk) {
    return res.status(401).json({ error: "Email o contraseña incorrectos" });
  }

  res.json({ token: createToken(user), user: publicUser(user) });
});

// GET /api/auth/me  -> devuelve el usuario del token
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
