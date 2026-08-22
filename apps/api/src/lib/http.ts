import type { ErrorRequestHandler, RequestHandler } from "express";
import type { z } from "zod";
import { config } from "../config.js";
import { AppError, notFound, validationError } from "./errors.js";

export function parseBody<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw validationError();
  }
  return result.data;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound());
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  void next;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  console.error(err);

  const isProd = config.NODE_ENV === "production";
  const message = err instanceof Error ? err.message : "Internal server error";

  res.status(500).json({
    error: {
      message: isProd ? "Internal server error" : message,
      code: "INTERNAL_ERROR",
      ...(isProd || !(err instanceof Error) ? {} : { stack: err.stack }),
    },
  });
};
