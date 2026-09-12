# Mini Operations ERP

A small, production-oriented full-stack ERP covering:
**Inventory → Work Order → Stock Check → Internal Transfer / Shortage → Customer Reservation**

## Tech Stack

| Layer          | Choice                                   | Why |
|----------------|-------------------------------------------|-----|
| Backend        | Node.js + Express                        | Fast to build, easy to reason about middleware/auth |
| ORM / DB       | Prisma + PostgreSQL (Neon)               | Production-ready relational DB with enum support, transactions, and strong concurrency guarantees |
| Auth           | JWT + bcrypt                             | Stateless, standard |
| Frontend       | React (Vite) + React Router              | Minimal, functional, fast dev loop |
| Testing        | Jest + Supertest                         | HTTP-level tests against the real Express app |

Business-critical correctness (no overselling, no double-receipt) is enforced
with **database transactions using conditional `UPDATE ... WHERE <headroom>`
statements** rather than "read then write" application logic — see
`ER_DIAGRAM.md` for the reasoning.

## Project Structure

```
mini-ops-erp/
├── backend/           Express API + Prisma schema + tests
├── frontend/          React (Vite) app — 5 screens
├── ER_DIAGRAM.md       Schema explanation + Mermaid diagram
└── postman_collection.json   Import into Postman for full API docs
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Update backend/.env with your Neon connection string
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev                   # starts API on http://localhost:4000
```

Seeded logins (password for all: `password123`):
- `admin@erp.com` — ADMIN
- `ops@erp.com` — OPERATIONS (location: WAREHOUSE-A)
- `sales@erp.com` — SALES

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env          # points at http://localhost:4000 by default
npm run dev                   # starts UI on http://localhost:5173
```

Open http://localhost:5173, log in with a seeded account, and use the nav to
move through Inventory → Work Orders → Transfers → Customer Orders.

## Database Setup

This project now defaults to PostgreSQL with Neon.

1. Copy `backend/.env.example` to `backend/.env`.
2. Replace the sample `DATABASE_URL` with your Neon connection string.
3. Run `npx prisma migrate dev --name init` to apply the schema and create the initial migration.
4. Run `npm run seed` to populate demo users and initial inventory.

The Prisma schema keeps the existing enums (`Role`, `WorkOrderStatus`, `TransferStatus`, `OrderStatus`) and uses PostgreSQL-specific features such as transactional conditional updates.

## Environment Variables

**backend/.env**
| Variable         | Purpose                              |
|------------------|----------------------------------------|
| `DATABASE_URL`   | Prisma connection string              |
| `JWT_SECRET`     | Secret used to sign auth tokens       |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `8h`)            |
| `PORT`           | API port (default 4000)               |

**frontend/.env**
| Variable        | Purpose                    |
|-----------------|------------------------------|
| `VITE_API_URL`  | Base URL of the backend API |

## How to Run

Two terminals:
```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

## How to Test

The 5 mandatory tests live in `backend/tests/app.test.js` and should run against a
separate PostgreSQL test database configured in `backend/.env.test` so they
never touch your Neon development data.

```bash
cd backend
npm test
```

This runs `prisma db push` against `.env.test` first (creating/refreshing the
test schema), then runs the Jest/Supertest suite:

1. **Cannot reserve more than available inventory** — including a concurrent
   double-reservation race, asserting exactly one of two simultaneous
   requests succeeds.
2. **Cannot transfer more than available inventory** — dispatch is rejected
   when requested quantity exceeds available stock at source.
3. **Destination stock increases only after receipt** — verified by checking
   destination inventory is absent/unchanged after dispatch, then correct
   after receive.
4. **Same transfer cannot be received twice** — second `/receive` call
   returns 409.
5. **Unauthorized user cannot perform a restricted operation** — a SALES
   user is rejected from creating a Work Order (Admin-only), and an
   unauthenticated request is rejected with 401.

> Note: `npm install` needs internet access to fetch Prisma's query engine
> binary the first time — this is a one-time download, same as any Prisma
> project.

## API Documentation

Import `postman_collection.json` into Postman (or any compatible tool) for
every endpoint with example request bodies. Summary:

| Method | Path                        | Role(s)              |
|--------|------------------------------|-----------------------|
| POST   | /auth/register               | Public               |
| POST   | /auth/login                  | Public               |
| GET    | /inventory                   | Any authenticated    |
| POST   | /inventory                   | ADMIN, OPERATIONS    |
| GET    | /items                       | Any authenticated    |
| GET    | /workorders                  | Any authenticated    |
| POST   | /workorders                  | ADMIN                |
| PATCH  | /workorders/:id/status       | ADMIN, OPERATIONS    |
| GET    | /transfers                   | Any authenticated    |
| POST   | /transfers                   | ADMIN, OPERATIONS    |
| POST   | /transfers/:id/dispatch      | ADMIN, OPERATIONS    |
| POST   | /transfers/:id/receive       | ADMIN, OPERATIONS    |
| GET    | /orders                      | Any authenticated    |
| POST   | /orders                      | ADMIN, SALES         |
| POST   | /orders/:id/cancel           | ADMIN, SALES         |

## Business Rules Implemented

- `availableQty = physicalQty - reservedQty`, always computed, never stored.
- Negative inventory, invalid quantities, and duplicate inventory
  transactions are all rejected at the API/DB layer.
- Work Order creation automatically computes shortage at the target location.
- Internal Transfer: source reduces on dispatch; destination is untouched
  until receipt; a transfer cannot be received twice.
- Customer Order reservation is race-safe: two concurrent reservations that
  together exceed available stock cannot both succeed, enforced via
  transactional conditional updates rather than app-level locking.
- Order cancellation releases reserved stock back to available (ready for
  the "Change 3" live-verification scenario).
- Users can optionally carry an assigned `location`; middleware
  (`enforceOwnLocation` in `middleware/authorize.js`) is already in place to
  restrict a user to their own location if that's the live-verification
  change drawn ("Change 4") — currently unused by default routes, wire it
  into a route's location param if requested live.

## Neon / PostgreSQL Notes

- The Prisma schema now targets PostgreSQL, which is required for enums in Prisma.
- Use a dedicated Neon database for development and a separate test database for `npm test`.
- The project’s business rules remain the same; the change is in the underlying database engine and the migration path.

## Demo Video Checklist (5–7 min)

1. Login as each role once to show role-based access.
2. Inventory: add stock, show available = physical - reserved.
3. Work Order: create one, show automatic shortage calculation.
4. Internal Transfer: request → dispatch (show source reduces, dest
   unchanged) → receive (show dest increases). Try receiving twice to show
   it's blocked.
5. Customer Order: reserve stock, then try to over-reserve to show the
   rejection. Cancel an order to show release.
6. (Optional) Run `npm test` on screen to show all 5 mandatory tests passing.

## Git History

Commit incrementally (schema → auth → inventory → work orders → transfers →
orders → frontend → tests → docs) rather than one final commit, per the
submission requirements.
