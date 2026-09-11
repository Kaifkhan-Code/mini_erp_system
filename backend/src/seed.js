require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./db");

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@erp.com" },
    update: {},
    create: { email: "admin@erp.com", passwordHash: password, role: "ADMIN" },
  });

  const ops = await prisma.user.upsert({
    where: { email: "ops@erp.com" },
    update: {},
    create: { email: "ops@erp.com", passwordHash: password, role: "OPERATIONS", location: "WAREHOUSE-A" },
  });

  const sales = await prisma.user.upsert({
    where: { email: "sales@erp.com" },
    update: {},
    create: { email: "sales@erp.com", passwordHash: password, role: "SALES" },
  });

  const item = await prisma.item.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "Steel Bolt M8", category: "Hardware" },
  }).catch(async () => {
    return prisma.item.create({ data: { name: "Steel Bolt M8", category: "Hardware" } });
  });

  await prisma.inventory.upsert({
    where: { itemId_location_batch: { itemId: item.id, location: "WAREHOUSE-A", batch: "B001" } },
    update: {},
    create: { itemId: item.id, location: "WAREHOUSE-A", batch: "B001", physicalQty: 100, reservedQty: 0 },
  });

  await prisma.inventory.upsert({
    where: { itemId_location_batch: { itemId: item.id, location: "WAREHOUSE-B", batch: "B002" } },
    update: {},
    create: { itemId: item.id, location: "WAREHOUSE-B", batch: "B002", physicalQty: 40, reservedQty: 0 },
  });

  console.log("Seed complete.");
  console.log("Login with: admin@erp.com / ops@erp.com / sales@erp.com, password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
