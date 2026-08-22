import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./lib/http.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { flagsRouter } from "./modules/flags/flags.router.js";
import { healthRouter } from "./modules/health/health.router.js";
import { workspacesRouter } from "./modules/workspaces/workspaces.router.js";
import "./types/express.js";

export const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json());

app.use(healthRouter);
app.use(authRouter);
app.use(workspacesRouter);
app.use(flagsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
