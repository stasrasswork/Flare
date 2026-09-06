import { createServer } from "node:http";
import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { redis, redisSub } from "./lib/redis.js";
import { rebuildAllSnapshots } from "./modules/flags/flags.snapshot.js";
import { attachGateway, type Gateway } from "./modules/gateway/gateway.js";

const server = createServer(app);
const SHUTDOWN_TIMEOUT_MS = 10_000;

let shuttingDown = false;
let gateway: Gateway | undefined;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);

  try {
    await gateway?.close();
    await Promise.race([
      new Promise<void>((resolve) => server.close(() => resolve())),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          server.closeAllConnections();
          resolve();
        }, SHUTDOWN_TIMEOUT_MS).unref();
      }),
    ]);
  } finally {
    await Promise.allSettled([prisma.$disconnect(), redis.quit(), redisSub.quit()]);
    process.exit(0);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

async function main() {
  await rebuildAllSnapshots();
  gateway = await attachGateway(server);

  await new Promise<void>((resolve, reject) => {
    server.listen(config.PORT, () => {
      console.log(`API listening on http://localhost:${config.PORT}`);
      resolve();
    });
    server.once("error", reject);
  });
}

void main().catch((err: unknown) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
