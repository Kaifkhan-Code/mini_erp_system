# Database Schema / ER Diagram

See `backend/prisma/schema.prisma` for the authoritative source. Diagram below
(renders on GitHub as Mermaid):

```mermaid
erDiagram
    USER ||--o{ WORK_ORDER : assigned
    USER ||--o{ CUSTOMER_ORDER : creates
    ITEM ||--o{ INVENTORY : stocked_as
    ITEM ||--o{ WORK_ORDER : required_in
    ITEM ||--o{ TRANSFER : moved_in
    ITEM ||--o{ CUSTOMER_ORDER : ordered_in
    INVENTORY ||--o{ INVENTORY_TRANSACTION : logs

    USER {
        int id PK
        string email
        string passwordHash
        enum role "ADMIN | OPERATIONS | SALES"
        string location "nullable, for location restriction"
    }

    ITEM {
        int id PK
        string name
        string category
    }

    INVENTORY {
        int id PK
        int itemId FK
        string location
        string batch
        int physicalQty
        int reservedQty
    }

    INVENTORY_TRANSACTION {
        int id PK
        int inventoryId FK
        string type "ADJUSTMENT | RESERVE | RELEASE | TRANSFER_OUT | TRANSFER_IN"
        int quantity
        string reference "idempotency key"
    }

    WORK_ORDER {
        int id PK
        string location
        int itemId FK
        int requiredQty
        int assignedUserId FK
        enum status "ASSIGNED | IN_PROGRESS | COMPLETED"
    }

    TRANSFER {
        int id PK
        string sourceLocation
        string destLocation
        int itemId FK
        int quantity
        enum status "REQUESTED | DISPATCHED | RECEIVED"
    }

    CUSTOMER_ORDER {
        int id PK
        int itemId FK
        string location
        int quantity
        enum status "RESERVED | CANCELLED | FULFILLED"
        int createdByUserId FK
    }
```

## Key design decisions

- **`availableQty` is never stored** — it is always computed as
  `physicalQty - reservedQty` at read time, so it can never drift out of sync.
- **One `Inventory` row per (item, location, batch)**, enforced by a unique
  constraint. This is also the mechanism that blocks duplicate stock lines.
- **`InventoryTransaction`** is an append-only audit log of every stock
  movement, keyed by an optional `reference` field used as an idempotency
  key to guard against duplicate transactions being replayed.
- **Reservation, dispatch, and receive are all done inside a single
  Prisma `$transaction`, using conditional `updateMany` calls** (`UPDATE ...
  WHERE <headroom still available>`). This turns "check, then write" into a
  single atomic database operation, which is what actually prevents two
  concurrent requests from over-reserving or over-transferring stock —
  a plain read-then-write in application code would have a race condition.
