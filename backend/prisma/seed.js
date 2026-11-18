import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  },
  {
    name: "Teclado mecánico",
    description: "Teclado compacto con switches mecánicos.",
    priceCents: 12999,
  },
  {
    name: "Mouse ergonómico",
    description: "Mouse inalámbrico diseñado para uso prolongado.",
    priceCents: 5499,
  },
];

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
  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (!existing) {
      await prisma.product.create({ data: product });
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
