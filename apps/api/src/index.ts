import { createServer } from "node:http";
import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { redis, redisSubscriber } from "./lib/redis.js";
import { rebuildAllSnapshots } from "./modules/flags/flags.snapshot.js";

const server = createServer(app);

server.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
  void rebuildAllSnapshots().catch((err: unknown) => {
    console.error("Failed to rebuild flag snapshots:", err);
  });
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  await Promise.allSettled([
    prisma.$disconnect(),
    redis.quit(),
    redisSubscriber.quit(),
  ]);

  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
