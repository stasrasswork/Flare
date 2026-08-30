# Flare

Realtime feature flags: Postgres as source of truth, Redis as hot cache and pub/sub, WebSocket delivery to SDKs, Express evaluate API, React admin.

Product brief: [`docs/PRODUCT.md`](docs/PRODUCT.md)

## Monorepo layout

| Path | Description |
|------|-------------|
| `apps/api` | Express HTTP + WebSocket + Prisma + Redis |
| `apps/web` | React + Vite admin |
| `packages/sdk-node` | `@flare/node` |
| `packages/sdk-react` | `@flare/react` |

## Prerequisites

- Node.js 20+
- Docker (PostgreSQL + Redis)
- npm

## Quick start

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

API: `http://localhost:3000`  
Web: `http://localhost:5173`

## Scripts (root)

| Command | Description |
|---------|-------------|
| `npm run dev:api` | API dev server |
| `npm run dev:web` | Web dev server |
| `npm run build` | Build SDKs, API, and web |
| `npm run lint` | Lint all workspaces |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed demo workspace, admin, flags |
| `npm run test` | API and `@flare/node` tests |
| `npm run demo:sdk` | Node SDK consumer against local API |
