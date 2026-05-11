# Frontend — Task Manager UI

React 18 + Vite + React Router. Talks to the backend on `http://localhost:3000` through the `/api` proxy configured in `vite.config.ts`.

## Quick start

```bash
npm install
npm run dev
# open http://localhost:5173
```

Make sure the [backend](../backend/README.md) is running on `:3000` first.

## Features

- Register / Login (JWT stored in `localStorage`)
- Protected `/tasks` route
- Create single task
- Bulk create (one title per line, up to 1000)
- Filter by status, update status inline, delete

## Notes

- Requires **Node 18+** (Vite 5).
- The token is sent as `Authorization: Bearer <token>` for every request via `src/api/client.ts`.
