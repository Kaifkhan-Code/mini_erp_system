const { PrismaClient } = require("@prisma/client");

// Single shared Prisma instance for the application.
const prisma = new PrismaClient();

module.exports = prisma;
