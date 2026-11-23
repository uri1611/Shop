import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { UPLOADS_DIR } from "../src/upload.js";

const prisma = new PrismaClient();

// Imágenes de ejemplo que SÍ están en el repo (backend/prisma/seed-images).
// El seed las copia a backend/uploads, igual que si las subiera un admin.
const SEED_IMAGES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "seed-images"
);

const users = [
  {
    email: "admin@example.com",
    password: "admin123",
    role: "ADMIN",
  },
  {
    email: "cliente@example.com",
    password: "cliente123",
    role: "CUSTOMER",
  },
];

const products = [
  {
    name: "Auriculares inalámbricos",
    description: "Auriculares Bluetooth con cancelación de ruido.",
    priceCents: 8999,
    image: "auriculares.webp",
  },
  {
    name: "Teclado mecánico",
    description: "Teclado compacto con switches mecánicos.",
    priceCents: 12999,
    image: "teclado.webp",
  },
  {
    name: "Mouse ergonómico",
    description: "Mouse inalámbrico diseñado para uso prolongado.",
    priceCents: 5499,
    image: "mouse.webp",
  },
];

// Copia una imagen de ejemplo a la carpeta uploads y devuelve
// el nombre con el que quedó (es lo que se guarda en la base).
function copySeedImage(image) {
  const filename = `seed-${image}`;
  fs.copyFileSync(
    path.join(SEED_IMAGES_DIR, image),
    path.join(UPLOADS_DIR, filename)
  );
  return filename;
}

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        role: user.role,
      },
      create: {
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
  }

  // Solo crea el producto si todavía no existe uno con ese nombre,
  // así se puede correr el seed varias veces sin duplicar.
  for (const { image, ...product } of products) {
    const imageFilename = copySeedImage(image);

    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (!existing) {
      await prisma.product.create({ data: { ...product, imageFilename } });
    } else if (!existing.imageFilename) {
      // Si ya existía sin imagen, le ponemos la de ejemplo.
      // Si un admin ya le subió una, no la tocamos.
      await prisma.product.update({
        where: { id: existing.id },
        data: { imageFilename },
      });
    }
  }

  console.log("Seed completado.");
}

main()
  .catch((error) => {
    console.error("No se pudo ejecutar el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
