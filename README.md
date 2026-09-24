# Mini Operations ERP

A full-stack ERP demo focused on inventory, work orders, internal transfers, and customer order reservation. The backend uses Express + MongoDB, and the frontend uses React + Vite. The complete stack runs with Docker Compose.

## Highlights

- Ops Pulse command center with live KPIs, inventory risk radar, workflow health, and recent activity stream
- Inventory tracking with physical, reserved, and available stock logic
- Work order creation with automatic shortage detection
- Internal transfer workflow with dispatch/receive rules
- Customer order reservation that prevents overselling using database transactions
- Role-based authentication for admin, operations, and sales users
- Automated backend tests covering the required business scenarios

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | MongoDB with transactional replica-set support |
| Authentication | JWT + bcryptjs |
| Frontend | React + Vite + React Router |
| Testing | Jest + Supertest |

## Project Structure

```text
mini-ops-erp/
├── backend/                  Express API, MongoDB adapter, tests, seed data
├── frontend/                 React app
├── ER_DIAGRAM.md             Database / business flow explanation
├── postman_collection.json   API examples for Postman
├── README.md                 Project overview and setup
├── .gitignore                Git ignore rules for secrets and generated files
└── .gitmodules               (if added later)
```

## Quick Start

### 1) Docker setup

The recommended setup starts MongoDB, the Express API, and the React/Nginx frontend together:

```bash
docker compose up --build
```

Open `http://localhost:8080`. The API is available at `http://localhost:4000`.

The MongoDB container runs as a single-node replica set so reservations and transfer workflows can use transactions safely. Stop the stack with `docker compose down`; add `-v` only when you want to delete the local database volume.

### 2) Backend setup without Docker

```bash
cd backend
npm install
cp .env.example .env
```

Update `backend/.env` with your MongoDB connection string and secrets.

```bash
npm install
npm run seed
npm run dev
```

The API will run at `http://localhost:4000`.

### 3) Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The UI will run at `http://localhost:5173`.

## Deploying to Vercel

Deploy this repository as two Vercel projects because the frontend and API have different build settings.

### 1) Deploy the backend

In Vercel, import the repository and set **Root Directory** to `backend`. The `backend/api/index.js` adapter exposes the Express API as a Vercel function.

Add these backend environment variables in Vercel for Production and Preview:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string, including a replica set |
| `MONGODB_DB` | Production database name |
| `JWT_SECRET` | A long, private random string |
| `JWT_EXPIRES_IN` | For example, `8h` |

Before using the deployed API, seed the hosted database:

```bash
cd backend
npm run seed
```

The deployed API URL will look like `https://your-backend.vercel.app`. Test it by opening `https://your-backend.vercel.app/health`; it should return `{"status":"ok"}`.

### 2) Deploy the frontend

Create a second Vercel project from the same repository and set **Root Directory** to `frontend`. Vercel will use `npm run build` and `dist` automatically.

Add this frontend environment variable for Production and Preview:

| Variable | Value |
|---|---|
| `VITE_API_URL` | The deployed backend URL, without a trailing slash, for example `https://your-backend.vercel.app` |

Redeploy the frontend after adding the variable. The frontend URL will look like `https://your-frontend.vercel.app`.

Do not upload `backend/.env` or `frontend/.env`; enter those values in Vercel's Environment Variables panel instead.

## Seeded Demo Accounts

Password for all seeded users: `password123`

- `admin@erp.com` — ADMIN
- `ops@erp.com` — OPERATIONS
- `sales@erp.com` — SALES

## Environment Variables

### Backend

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string; Docker uses the `rs0` replica set |
| `MONGODB_DB` | MongoDB database name |
| `JWT_SECRET` | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, for example `8h` |
| `PORT` | API port, default `4000` |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

## Database Notes

- MongoDB collections replace the previous Prisma/PostgreSQL schema.
- MongoDB transactions require a replica set; Docker Compose configures a single-node `rs0` automatically.
- Numeric IDs are retained at the API boundary so existing frontend routes and seed accounts remain compatible.

## Testing

```bash
cd backend
npm test
```

The test suite verifies:

1. Overselling is rejected for inventory reservations
2. Transfers cannot exceed available stock
3. Destination inventory changes only after receipt
4. A transfer cannot be received twice
5. Unauthorized users cannot create restricted work orders
6. Duplicate inventory transactions are rejected

## API Documentation

Import `postman_collection.json` into Postman or a compatible tool to explore the available endpoints.

## Business Rules Implemented

- `availableQty = physicalQty - reservedQty`
- Inventory updates are protected by transactional conditional updates
- Internal transfer source inventory is reduced on dispatch, not on request
- Destination inventory increases only after receipt
- Order cancellation releases reserved stock back into availability
- Work order creation computes shortage automatically

## Development Notes

- Run the backend and frontend in separate terminals when developing without Docker.
- Keep your real MongoDB credentials in `backend/.env`; do not commit them.
- Use MongoDB Atlas with replica-set support for deployed transactional workflows.

## Useful References

- [ER_DIAGRAM.md](ER_DIAGRAM.md)
- [postman_collection.json](postman_collection.json)
