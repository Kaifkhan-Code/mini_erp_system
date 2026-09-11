const { PrismaClient } = require("@prisma/client");

// Single shared Prisma instance (recommended pattern to avoid exhausting
// DB connections, especially important for SQLite's single-writer model).
const prisma = new PrismaClient();

module.exports = prisma;
