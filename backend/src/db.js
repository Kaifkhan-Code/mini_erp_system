const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/mini_ops_erp?replicaSet=rs0";
const dbName = process.env.MONGODB_DB || "mini_ops_erp";
const client = new MongoClient(uri);
let database;
let ready;

const collectionNames = {
  user: "users", item: "items", inventory: "inventory", inventoryTransaction: "inventory_transactions",
  workOrder: "work_orders", transfer: "transfers", customerOrder: "customer_orders",
};
const relationMap = {
  inventory: { item: ["itemId", "item"] },
  customerOrder: { item: ["itemId", "item"], createdBy: ["createdByUserId", "createdBy"] },
  transfer: { item: ["itemId", "item"] },
  workOrder: { item: ["itemId", "item"], assignedUser: ["assignedUserId", "assignedUser"] },
};

async function connect() {
  if (!ready) {
    ready = client.connect().then(async () => {
      database = client.db(dbName);
      await Promise.all([
        database.collection("users").createIndex({ email: 1 }, { unique: true }),
        database.collection("inventory").createIndex({ itemId: 1, location: 1, batch: 1 }, { unique: true }),
        database.collection("inventory_transactions").createIndex({ reference: 1, type: 1 }, { unique: true, sparse: true }),
      ]);
      return database;
    });
  }
  return ready;
}

function flatten(where = {}) {
  const { itemId_location_batch, reference_type, ...rest } = where;
  return { ...rest, ...(itemId_location_batch || {}), ...(reference_type || {}) };
}

function mongoFilter(where = {}) {
  const filter = flatten(where);
  for (const [key, expected] of Object.entries(filter)) {
    if (!expected || typeof expected !== "object" || Array.isArray(expected)) continue;
    const operators = { gt: "$gt", gte: "$gte", lt: "$lt", lte: "$lte", in: "$in" };
    filter[key] = Object.fromEntries(Object.entries(expected).map(([operator, value]) => [operators[operator] || operator, value]));
  }
  return filter;
}

function applyUpdate(document, data) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (value.increment !== undefined) document[key] = (document[key] || 0) + value.increment;
      else if (value.decrement !== undefined) document[key] = (document[key] || 0) - value.decrement;
      else document[key] = value;
    } else document[key] = value;
  }
  document.updatedAt = new Date();
  return document;
}

async function nextId(model, session) {
  await database.collection("counters").findOneAndUpdate(
    { _id: model }, { $inc: { value: 1 } }, { upsert: true, session }
  );
  const counter = await database.collection("counters").findOne({ _id: model }, { session });
  return counter.value;
}

function modelApi(model, session) {
  const collection = () => database.collection(collectionNames[model]);
  const options = () => session ? { session } : {};
  async function populate(row, include) {
    if (!row || !include) return row;
    const result = { ...row };
    for (const [relation, [foreignKey]] of Object.entries(relationMap[model] || {})) {
      if (!include[relation]) continue;
      const relatedModel = relation === "item" ? "item" : "user";
      const related = await modelApi(relatedModel, session).findUnique({ where: { id: row[foreignKey] } });
      result[relation] = include[relation].select && related
        ? Object.fromEntries(Object.keys(include[relation].select).filter((key) => include[relation].select[key]).map((key) => [key, related[key]]))
        : related;
    }
    return result;
  }
  return {
    async findMany({ where, include, orderBy } = {}) {
      await connect();
      let rows = await collection().find(mongoFilter(where), options()).toArray();
      if (orderBy) { const [field, direction] = Object.entries(orderBy)[0]; rows.sort((a, b) => (a[field] - b[field]) * (direction === "desc" ? -1 : 1)); }
      return Promise.all(rows.map((row) => populate(row, include)));
    },
    async findFirst(args = {}) { const rows = await this.findMany(args); return rows[0] || null; },
    async findUnique({ where, include } = {}) { await connect(); return populate(await collection().findOne(mongoFilter(where), options()), include); },
    async create({ data, include } = {}) {
      await connect();
      const document = { ...data, id: await nextId(model, session), createdAt: data.createdAt || new Date() };
      await collection().insertOne(document, options());
      return populate(document, include);
    },
    async update({ where, data, include } = {}) {
      await connect();
      const existing = await collection().findOne(mongoFilter(where), options());
      if (!existing) throw new Error(`${model} not found`);
      const updated = applyUpdate(existing, data);
      await collection().replaceOne({ _id: existing._id }, updated, options());
      return populate(updated, include);
    },
    async updateMany({ where, data } = {}) {
      await connect();
      const rows = await collection().find(mongoFilter(where), options()).toArray();
      for (const row of rows) await collection().replaceOne({ _id: row._id }, applyUpdate(row, data), options());
      return { count: rows.length };
    },
    async upsert({ where, update, create, include } = {}) { const found = await this.findUnique({ where }); return found ? this.update({ where, data: update, include }) : this.create({ data: create, include }); },
    async deleteMany({ where } = {}) { await connect(); return { count: (await collection().deleteMany(mongoFilter(where), options())).deletedCount }; },
  };
}

const api = {};
for (const model of Object.keys(collectionNames)) api[model] = modelApi(model);
api.$transaction = async (callback) => {
  await connect();
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const tx = {};
      for (const model of Object.keys(collectionNames)) tx[model] = modelApi(model, session);
      result = await callback(tx);
    });
    return result;
  } finally { await session.endSession(); }
};
api.$disconnect = () => client.close();
api.connect = connect;
module.exports = api;
