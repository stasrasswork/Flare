import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import { config } from "../../config.js";
import { redis, redisSub, waitUntilReady } from "../../lib/redis.js";
import { sdkIndexKey } from "../../lib/sdk-index.js";
import {
  envIdFromChannel,
  FLAG_CHANNEL_PATTERN,
} from "../flags/flags.snapshot-types.js";
import { getSnapshot } from "../flags/flags.snapshot-read.js";
import { addClient, broadcast, clearClients, hasClients, removeClient } from "./connections.js";
import {
  errorMessage,
  HELLO_TIMEOUT_MS,
  MAX_PAYLOAD_BYTES,
  parseClientMessage,
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  snapshotMessage,
  STREAM_PATH,
  WsClose,
  type ClientMessage,
  type ServerMessage,
} from "./gateway.protocol.js";
import { presenceAdd, presenceHeartbeat, presenceRemove } from "./presence.js";

export type Gateway = {
  close: () => Promise<void>;
};

type Session = {
  ws: WebSocket;
  connId: string;
  envId?: string;
  closed: boolean;
  helloStarted: boolean;
  helloTimer: NodeJS.Timeout;
  pingTimer?: NodeJS.Timeout;
  pongTimer?: NodeJS.Timeout;
};

function upgradePath(url: string | undefined): string {
  try {
    return new URL(url ?? "/", "http://localhost").pathname;
  } catch {
    return "";
  }
}

function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (origin === undefined) {
    return true;
  }
  return origin === config.CORS_ORIGIN;
}

function readText(data: WebSocket.RawData): string | undefined {
  if (typeof data === "string") {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }
  return undefined;
}

function sendJson(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }
  ws.send(JSON.stringify(message));
}

function sendAndClose(ws: WebSocket, code: number, message: ServerMessage): void {
  if (ws.readyState !== WebSocket.OPEN) {
    ws.terminate();
    return;
  }

  ws.send(JSON.stringify(message), () => {
    ws.close(code);
  });
}

async function fanout(channel: string): Promise<void> {
  const envId = envIdFromChannel(channel);
  if (!envId || !hasClients(envId)) {
    return;
  }

  const snapshot = await getSnapshot(envId);
  if (!snapshot) {
    return;
  }

  broadcast(envId, JSON.stringify(snapshotMessage(snapshot)));
}

export async function attachGateway(server: Server): Promise<Gateway> {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
  const sessions = new Set<Session>();
  let closing = false;

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    socket.on("error", () => {});

    if (closing || upgradePath(req.url) !== STREAM_PATH) {
      socket.destroy();
      return;
    }

    if (!originAllowed(req)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  };

  server.on("upgrade", onUpgrade);

  const onPMessage = (_pattern: string, channel: string) => {
    void fanout(channel).catch((err: unknown) => {
      console.error("Flag snapshot fan-out failed:", err);
    });
  };

  redisSub.on("pmessage", onPMessage);
  await waitUntilReady(redisSub);
  await redisSub.psubscribe(FLAG_CHANNEL_PATTERN);

  function clearTimers(session: Session): void {
    clearTimeout(session.helloTimer);
    if (session.pingTimer) {
      clearInterval(session.pingTimer);
    }
    if (session.pongTimer) {
      clearTimeout(session.pongTimer);
    }
  }

  function dispose(session: Session): void {
    if (session.closed) {
      return;
    }
    session.closed = true;
    clearTimers(session);
    sessions.delete(session);

    if (session.envId) {
      removeClient(session.envId, session.connId);
      void presenceRemove(session.envId, session.connId).catch((err: unknown) => {
        console.error("Failed to clear SDK presence:", err);
      });
    }
  }

  function startHeartbeat(session: Session): void {
    session.pingTimer = setInterval(() => {
      if (session.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      session.ws.ping();
      session.pongTimer = setTimeout(() => {
        session.ws.terminate();
      }, PONG_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
  }

  async function onHello(session: Session, message: Extract<ClientMessage, { type: "hello" }>): Promise<void> {
    const envId = await redis.get(sdkIndexKey(message.sdkKey));
    if (session.closed) {
      return;
    }
    if (!envId) {
      sendAndClose(session.ws, WsClose.UNAUTHORIZED, errorMessage("UNAUTHORIZED", "Invalid SDK key"));
      return;
    }

    const snapshot = await getSnapshot(envId);
    if (session.closed) {
      return;
    }
    if (!snapshot) {
      sendAndClose(session.ws, WsClose.NOT_FOUND, errorMessage("NOT_FOUND", "Snapshot not found"));
      return;
    }

    session.envId = envId;
    addClient({ ws: session.ws, connId: session.connId, envId });
    await presenceAdd(envId, session.connId).catch((err: unknown) => {
      console.error("Failed to record SDK presence:", err);
    });
    if (session.closed) {
      void presenceRemove(envId, session.connId).catch(() => undefined);
      removeClient(envId, session.connId);
      return;
    }

    sendJson(session.ws, snapshotMessage(snapshot));
    startHeartbeat(session);
  }

  async function onResync(session: Session, version: number): Promise<void> {
    if (!session.envId) {
      sendAndClose(session.ws, WsClose.BAD_MESSAGE, errorMessage("BAD_MESSAGE", "Hello required"));
      return;
    }

    const snapshot = await getSnapshot(session.envId);
    if (session.closed) {
      return;
    }
    if (!snapshot) {
      sendAndClose(session.ws, WsClose.NOT_FOUND, errorMessage("NOT_FOUND", "Snapshot not found"));
      return;
    }

    if (version < snapshot.version) {
      sendJson(session.ws, snapshotMessage(snapshot));
    }
  }

  wss.on("connection", (ws) => {
    const session: Session = {
      ws,
      connId: randomUUID(),
      closed: false,
      helloStarted: false,
      helloTimer: setTimeout(() => {
        if (session.closed || session.helloStarted) {
          return;
        }
        sendAndClose(ws, WsClose.HELLO_TIMEOUT, errorMessage("UNAUTHORIZED", "Hello timeout"));
      }, HELLO_TIMEOUT_MS),
    };
    sessions.add(session);

    ws.on("pong", () => {
      if (session.pongTimer) {
        clearTimeout(session.pongTimer);
        session.pongTimer = undefined;
      }
      if (session.envId) {
        void presenceHeartbeat(session.envId, session.connId).catch((err: unknown) => {
          console.error("Failed to refresh SDK presence:", err);
        });
      }
    });

    ws.on("message", (data) => {
      const text = readText(data);
      const message = text === undefined ? null : parseClientMessage(text);
      if (!message) {
        sendAndClose(ws, WsClose.BAD_MESSAGE, errorMessage("BAD_MESSAGE", "Invalid message"));
        return;
      }

      if (message.type === "hello") {
        if (session.helloStarted || session.envId) {
          sendAndClose(ws, WsClose.BAD_MESSAGE, errorMessage("BAD_MESSAGE", "Already authenticated"));
          return;
        }
        session.helloStarted = true;
        clearTimeout(session.helloTimer);
        void onHello(session, message).catch((err: unknown) => {
          console.error("SDK hello failed:", err);
          sendAndClose(ws, WsClose.BAD_MESSAGE, errorMessage("BAD_MESSAGE", "Hello failed"));
        });
        return;
      }

      void onResync(session, message.version).catch((err: unknown) => {
        console.error("SDK resync failed:", err);
      });
    });

    ws.on("close", () => {
      dispose(session);
    });

    ws.on("error", () => {
      ws.terminate();
    });
  });

  return {
    async close() {
      closing = true;
      server.off("upgrade", onUpgrade);
      redisSub.off("pmessage", onPMessage);

      for (const session of sessions) {
        dispose(session);
        session.ws.terminate();
      }
      clearClients();

      await redisSub.punsubscribe(FLAG_CHANNEL_PATTERN).catch(() => undefined);
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
    },
  };
}
