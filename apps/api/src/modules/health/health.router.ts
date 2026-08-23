import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

healthRouter.get(
  "/health/ready",
  asyncHandler(async (_req, res) => {
    const [postgres, redisOk] = await Promise.all([
      prisma.$queryRaw`SELECT 1`
        .then(() => true)
        .catch(() => false),
      redis
        .ping()
        .then(() => true)
        .catch(() => false),
    ]);

    const ok = postgres && redisOk;
    res.status(ok ? 200 : 503).json({ ok, postgres, redis: redisOk });
  }),
);
