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
docker compose up --build
```

API: `http://localhost:3000`
Web: `http://localhost:5173`

The API container waits for PostgreSQL and Redis, applies migrations, and seeds the demo workspace before listening.

Demo login:

```text
email: admin@flare.local
password: flare-dev
```

For local development without the API/web containers:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
```

Then run `npm run dev:api` and `npm run dev:web` in separate terminals.

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
| `npm run test` | API, SDK, and web tests |
| `npm run demo:sdk` | Node SDK consumer against local API |

## Demo flow

1. Open the web app and sign in with the demo credentials.
2. Switch between `dev` and `prod` and toggle `buy-one-click`.
3. Change the `new-feed` rollout percentage and add a targeting rule.
4. Expand a flag's audit history and roll back a previous state.
5. In another terminal, run `npm run demo:sdk` and verify that each change prints `update` without a reload.

Stop the stack with `docker compose down`. Add `-v` when you want to remove the local PostgreSQL volume and reset the demo data.
