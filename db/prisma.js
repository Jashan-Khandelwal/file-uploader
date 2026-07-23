// Single shared PrismaClient. Creating one per request exhausts the connection pool.
const { PrismaClient } = require("@prisma/client");

module.exports = new PrismaClient();
