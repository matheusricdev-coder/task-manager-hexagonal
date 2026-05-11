# Backend — Task Manager API

Hexagonal architecture, Express, Prisma + MySQL, JWT.

See the [root README](../README.md) for the full architecture and setup guide.

## Quick start

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Tests

```bash
npm test
```

48 unit tests covering use cases (with mocked ports) and the HTTP layer (controllers, auth middleware, global error handler).
