# Task Manager — Hexagonal Architecture

Fullstack task management application built strictly under the **Ports and Adapters (Hexagonal) Architecture**. The focus is on a clean, testable backend; the React frontend is intentionally minimal and consumes the API end-to-end.

---

## Stack

| Layer    | Tech |
|----------|------|
| Language | TypeScript (`strict: true`) |
| Backend  | Express + Zod + JWT + bcryptjs |
| ORM / DB | Prisma + MySQL 8 |
| Frontend | React 18 + Vite + React Router |
| Tests    | Jest + ts-jest |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  infrastructure/                                            │
│  ┌────────────────┐    ┌─────────────────┐    ┌──────────┐  │
│  │ http (Express) │    │ database (Prisma│    │ security │  │
│  │ controllers    │    │   repositories) │    │ (bcrypt, │  │
│  │ middlewares    │    │                 │    │  JWT)    │  │
│  │ routes, schemas│    │                 │    │          │  │
│  └────────┬───────┘    └─────────┬───────┘    └────┬─────┘  │
└───────────┼───────────────────────┼──────────────────┼──────┘
            │ depends on            │ implements       │ implements
            ▼                       ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  application/   (Use cases + Ports)                         │
│  • useCases/auth/{RegisterUser, LoginUser}                  │
│  • useCases/tasks/{Create, CreateBulk, GetById, List,       │
│                     Update, Delete}                         │
│  • ports/repositories/{UserRepository, TaskRepository}      │
│  • ports/services/{HashService, TokenService}               │
└─────────────────────────────────┬───────────────────────────┘
                                  │ uses
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  domain/   (Entities + Errors — zero external imports)      │
│  • entities/{User, Task}                                    │
│  • errors/{DomainError, TaskNotFoundException,              │
│            UnauthorizedTaskAccessException,                 │
│            UserAlreadyExistsException,                      │
│            InvalidCredentialsException,                     │
│            UnauthenticatedException, ValidationException}   │
└─────────────────────────────────────────────────────────────┘
```

**Dependency rule:** arrows only point inward. `domain` knows nothing. `application` only knows `domain` and its own ports. `infrastructure` implements ports and wires everything together (no domain/application code imports from infrastructure — verifiable by grepping `from "@prisma/client"` outside `src/infrastructure`).

### Request pipeline

`HTTP request → CORS → JSON body → sanitize middleware → (auth middleware for /tasks/*) → Controller (Zod validation + DTO mapping) → Use Case (ports only) → Repository (Prisma) → Response → Global error handler maps domain exceptions to HTTP status codes`.

| Domain exception                  | HTTP |
|-----------------------------------|------|
| `ValidationException` / `ZodError`| 400  |
| `UnauthenticatedException`        | 401  |
| `InvalidCredentialsException`     | 401  |
| `UnauthorizedTaskAccessException` | 403  |
| `TaskNotFoundException`           | 404  |
| `UserAlreadyExistsException`      | 409  |
| anything else                     | 500  |

---

## Project layout

```
task-manager-hexagonal/
├── docker-compose.yml          # MySQL 8 for local dev
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── index.ts            # bootstrap
│   ├── tests/
│   │   ├── unit/useCases/
│   │   └── unit/http/
│   ├── jest.config.ts
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── api/client.ts       # fetch wrapper + DTOs
    │   ├── context/AuthContext.tsx
    │   ├── pages/{Login,Register,Tasks}Page.tsx
    │   └── App.tsx
    └── vite.config.ts          # /api proxies to localhost:3000
```

---

## Setup

### Requirements

- **Node 18+** (Vite 5 + ts-jest)
- **Docker** (for MySQL — or your own MySQL 8 with matching credentials)

### 1. Start MySQL

```bash
docker compose up -d
```

This brings up MySQL 8 on `localhost:3306` with database `task_manager` and user `app/app_password`.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates tables
npm run dev                           # http://localhost:3000
```

> **Note about MySQL users.** `.env.example` uses the `root` user on purpose:
> `prisma migrate dev` needs to create a *shadow database* to detect drift, and
> the unprivileged `app` user from `docker-compose.yml` cannot `CREATE DATABASE`.
> For production, switch the `DATABASE_URL` to the `app` user and either give
> the deploy account `CREATE DATABASE` privileges or set a `SHADOW_DATABASE_URL`
> ([Prisma docs](https://pris.ly/d/migrate-shadow)).

Available scripts:

| Script | What it does |
|--------|--------------|
| `npm run dev` | Hot-reload server (ts-node-dev) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled JS |
| `npm test` | Run full Jest suite |
| `npm run test:coverage` | Tests + coverage report |
| `npm run prisma:migrate` | Run dev migrations |
| `npm run prisma:migrate:deploy` | Apply migrations in prod |
| `npm run prisma:studio` | Open Prisma Studio |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxies /api → http://localhost:3000)
```

---

## API

Base: `http://localhost:3000`

| Method | Path           | Auth | Body / Notes |
|--------|----------------|------|--------------|
| POST   | `/auth/register`| —    | `{ email, name, password }` |
| POST   | `/auth/login`   | —    | `{ email, password }` |
| GET    | `/tasks`        | ✅   | optional `?status=PENDING&search=foo` |
| GET    | `/tasks/:id`    | ✅   | owner-only |
| POST   | `/tasks`        | ✅   | single: `{ title, description?, status? }` **or** bulk: `{ tasks: [...] }` (max 1000) |
| PATCH  | `/tasks/:id`    | ✅   | partial update |
| DELETE | `/tasks/:id`    | ✅   | owner-only, returns 204 |

All authenticated endpoints require `Authorization: Bearer <jwt>`. The token is returned by `/auth/register` and `/auth/login`.

### Bulk example

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tasks":[{"title":"A"},{"title":"B"},{"title":"C"}]}'
# → { "created": 3 }
```

---

## Testing

```bash
cd backend
npm test
```

Two test categories are required by the challenge — both are covered:

### Use cases (with mocked ports)

`tests/unit/useCases/**/*.test.ts` — each use case is instantiated with `jest.Mocked<Repository>` / `jest.Mocked<Service>` fakes. We assert:

- the **business rules** (ownership checks, duplicate-email checks, bulk limits)
- which **ports are called** and with which arguments
- that domain exceptions are raised on the right preconditions

### Communication layer (controllers + middlewares)

`tests/unit/http/**/*.test.ts` — Controllers receive `jest.Mocked<UseCase>` fakes and a mocked Express `req/res`. We assert:

- invalid input ⇒ `ZodError` (which the global error handler maps to 400)
- success ⇒ correct status code + payload
- domain exceptions propagate to the global error handler unchanged
- `authMiddleware` rejects missing/invalid tokens
- `errorHandler` maps each domain exception class to its `httpStatus`

### Why this testing strategy for the use cases

The use case is the **only layer** where the business rules of the application live, so it is the most valuable unit to test in isolation. By depending on **interfaces (ports)** instead of Prisma/JWT/bcrypt, the use case can be exercised against in-memory fakes — no MySQL, no real hashing, no JWT verification — which makes the tests:

- **Fast and deterministic** (the full suite runs in under 3 seconds).
- **Behavior-focused**: we assert *what the rule guarantees* (e.g. "non-owners cannot delete a task", "bulk size 1001 is rejected"), not the implementation details of the database call.
- **Refactor-proof against infrastructure**: swapping Prisma for Mongoose, or bcrypt for Argon2, doesn't break a single use case test, because none of them know those adapters exist.
- **Driven by mocks, not stubs**: `jest.Mocked<Port>` lets us assert on `toHaveBeenCalledWith(...)` so we verify the use case orchestrates its collaborators correctly — which is the actual contract a use case owns.

Repositories and Prisma queries are intentionally *not* tested here at the unit level: that's the role of integration tests against a real database, which are out of scope but trivial to add later using a docker-compose test database.

---

## Architectural decisions

- **Prisma + MySQL** over Mongoose + Mongo: stronger compile-time types via the generated client, native `createMany` for bulk, simpler relational ownership model for `Task → User`.
- **Manual DI** over a container library (`tsyringe`, `inversify`): only one composition root (`infrastructure/http/container.ts`), so explicit wiring is clearer than reflection-based DI and keeps the application layer free of decorators.
- **Use cases as classes**, not free functions: keeps constructor-injected dependencies obvious and matches the article structure verbatim.
- **One use case per operation**: each file is small, has one reason to change, and exposes a single `execute(input)` — easier to mock in controllers and simpler to read in PRs.
- **Domain exceptions own their HTTP code**: every `DomainError` subclass declares `httpStatus` and `code`, so the global error handler is a 5-line lookup rather than a switch statement that has to be kept in sync.
- **Zod at the boundary only**: schemas live in `infrastructure/http/schemas/` and never leak into the application layer; the use case's input type is its source of truth, not the schema.
- **JWT payload is `{ userId, email }`**: small, signed, no role info yet (single-tenant). Easy to extend.
- **Sanitization middleware** strips ASCII control characters from strings in `req.body` / `req.query` before anything else touches them — cheap defense in depth on top of Zod validation.
