import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

// Carpeta donde se guardan las imágenes: backend/uploads.
// La calculamos a partir de este archivo para que funcione
// sin importar desde qué carpeta se arranque el servidor.
export const UPLOADS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "uploads"
);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Tipos permitidos y la extensión con la que guardamos cada uno.
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  // Nombre aleatorio: evita choques entre archivos con el mismo nombre
  // y que alguien use un nombre de archivo raro (ej: "../../algo").
  filename: (_req, file, cb) => {
    cb(null, crypto.randomUUID() + ALLOWED_TYPES[file.mimetype]);
  },
});

// Multer configurado para recibir UN archivo en el campo "image".
export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      const error = new Error("Solo se aceptan imágenes JPG, PNG o WEBP");
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
}).single("image");

// Borra un archivo de la carpeta uploads. Si no existe, no pasa nada.
export function deleteUploadedFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(UPLOADS_DIR, filename), () => {});
}
