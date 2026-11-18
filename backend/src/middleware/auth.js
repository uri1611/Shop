import jwt from "jsonwebtoken";
import prisma from "../db.js";

// Verifica que la request traiga un token válido en el header:
//   Authorization: Bearer <token>
// Si es válido, deja el usuario en req.user para las rutas siguientes.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Tenés que iniciar sesión" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }

  // Buscamos el usuario en la base en cada request: así, si cambia su rol
  // o se borra, el token viejo no le da permisos que ya no tiene.
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user) {
    return res.status(401).json({ error: "Sesión inválida o expirada" });
  }

  req.user = { id: user.id, email: user.email, role: user.role };
  next();
}

// Se usa siempre DESPUÉS de requireAuth. Deja pasar solo a los ADMIN.
export function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "No tenés permisos para esta acción" });
  }

  next();
}
