import { PrismaClient } from "@prisma/client";

// Una sola instancia de Prisma para toda la aplicación.
// Las rutas la importan desde acá en vez de crear la suya.
const prisma = new PrismaClient();

export default prisma;
