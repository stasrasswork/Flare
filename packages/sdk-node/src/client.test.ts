import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, describe, it } from "node:test";
import { WebSocket, WebSocketServer } from "ws";
import { Flare } from "./client.js";
import { FlareAuthError, FlareTimeoutError } from "./errors.js";
import type { FlagSnapshot } from "./types.js";

type MockGateway = {
  url: string;
  push: (snapshot: FlagSnapshot) => void;
  close: () => Promise<void>;
};

const enabledSnapshot: FlagSnapshot = {
  version: 1,
  flags: {
    "buy-one-click": {
      type: "BOOLEAN",
      enabled: true,
      defaultValue: true,
      rules: [],
    },
  },
};

const disabledSnapshot: FlagSnapshot = {
  version: 2,
  flags: {
    "buy-one-click": {
      type: "BOOLEAN",
      enabled: false,
      defaultValue: true,
      rules: [],
    },
  },
};

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind mock gateway");
  }
  return address.port;
}

async function startMock(options: { validKey?: string; sendSnapshot?: boolean } = {}): Promise<MockGateway> {
  const validKey = options.validKey ?? "flr_s_good";
  const sendSnapshot = options.sendSnapshot ?? true;
  const server = createServer();
  const wss = new WebSocketServer({ noServer: true });
  const sockets = new Set<WebSocket>();

  server.on("upgrade", (req, socket, head) => {
    const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    if (path !== "/v1/stream") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    sockets.add(ws);
    ws.on("close", () => {
      sockets.delete(ws);
    });
    ws.on("message", (data) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(data));
      } catch {
        ws.close(4400);
        return;
      }
      const message = parsed as { type?: string; sdkKey?: string; sdk?: string };
      if (message.type !== "hello" || message.sdk !== "node") {
        ws.close(4400);
        return;
      }
      if (message.sdkKey !== validKey) {
        ws.send(JSON.stringify({ type: "error", code: "UNAUTHORIZED", message: "Invalid SDK key" }));
        ws.close(4401);
        return;
      }
      if (sendSnapshot) {
        ws.send(JSON.stringify({ type: "snapshot", ...enabledSnapshot }));
      }
    });
  });

  const port = await listen(server);

  return {
    url: `http://127.0.0.1:${port}`,
    push(snapshot) {
      const payload = JSON.stringify({ type: "snapshot", version: snapshot.version, flags: snapshot.flags });
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    },
    async close() {
      for (const ws of sockets) {
        ws.terminate();
      }
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    },
  };
}

describe("Flare.init", () => {
  const gateways: MockGateway[] = [];

  after(async () => {
    await Promise.all(gateways.map((gateway) => gateway.close()));
  });

  it("loads a snapshot and evaluates locally", async () => {
    const gateway = await startMock();
    gateways.push(gateway);

    const flare = await Flare.init({ sdkKey: "flr_s_good", url: gateway.url });
    assert.equal(flare.ready, true);
    assert.equal(flare.version, 1);
    assert.equal(flare.isEnabled("buy-one-click"), true);
    assert.equal(flare.getValue("missing", false), false);
    assert.equal(flare.details("buy-one-click").reason, "DEFAULT");

    const updated = new Promise<void>((resolve) => {
      flare.on("update", ({ version }) => {
        if (version === 2) {
          resolve();
        }
      });
    });
    gateway.push(disabledSnapshot);
    await updated;

    assert.equal(flare.isEnabled("buy-one-click"), false);
    assert.equal(flare.details("buy-one-click").reason, "DISABLED");
    await flare.close();
  });

  it("rejects an invalid SDK key", async () => {
    const gateway = await startMock();
    gateways.push(gateway);

    await assert.rejects(
      Flare.init({ sdkKey: "flr_s_bad", url: gateway.url, timeoutMs: 2_000 }),
      FlareAuthError,
    );
  });

  it("times out if no snapshot arrives", async () => {
    const gateway = await startMock({ sendSnapshot: false });
    gateways.push(gateway);

    await assert.rejects(
      Flare.init({ sdkKey: "flr_s_good", url: gateway.url, timeoutMs: 200 }),
      FlareTimeoutError,
    );
  });
});
