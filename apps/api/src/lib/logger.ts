import pino from "pino";
import { config } from "../config.js";

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "sdkKey",
    "sdk_key",
  ],
  ...(config.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            singleLine: true,
          },
        },
      }
    : {}),
});