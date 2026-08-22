/* Express request augmentation uses a namespace merge by design. */
/* eslint-disable @typescript-eslint/no-namespace */

import type { AuthContext } from "../lib/auth-context.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
