import type { Request } from "express";
import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { unauthorized } from "../../lib/errors.js";
import { parseBody } from "../../lib/http.js";
import { evaluateSchema } from "./evaluate.schema.js";
import { evaluateFlag } from "./evaluate.service.js";

export const evaluateRouter = Router();

function readSdkKey(req: Request): string {
  const raw = req.headers.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) {
    throw unauthorized();
  }

  const [scheme, ...rest] = header.split(" ");
  const sdkKey = rest.join(" ").trim();
  if (scheme.toLowerCase() !== "bearer" || !sdkKey) {
    throw unauthorized();
  }

  return sdkKey;
}

evaluateRouter.post(
  "/v1/evaluate",
  asyncHandler(async (req, res) => {
    const result = await evaluateFlag(readSdkKey(req), parseBody(evaluateSchema, req.body));
    res.json(result);
  }),
);
