import type { Response } from "express";
import { Router } from "express";
import { getAuth } from "../../lib/auth-context.js";
import { parseBody } from "../../lib/http.js";
import { clearSessionCookie, issueSession } from "../../lib/session.js";
import type { UserDto } from "./auth.dto.js";
import { requireAuth } from "./auth.middleware.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { getMe, login, register } from "./auth.service.js";

export const authRouter = Router();

async function sendAuthResponse(res: Response, user: UserDto, status: 200 | 201) {
  await issueSession(res, user.id);
  res.status(status).json({ user });
}

authRouter.post("/auth/register", async (req, res) => {
  const user = await register(parseBody(registerSchema, req.body));
  await sendAuthResponse(res, user, 201);
});

authRouter.post("/auth/login", async (req, res) => {
  const user = await login(parseBody(loginSchema, req.body));
  await sendAuthResponse(res, user, 200);
});

authRouter.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  res.json(await getMe(getAuth(req).userId));
});
