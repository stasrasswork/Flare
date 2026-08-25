import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { WebSocket } from "ws";
import {
  addClient,
  broadcast,
  clearClients,
  getClients,
  hasClients,
  removeClient,
  type GatewayClient,
} from "./connections.js";

function fakeClient(envId: string, connId: string, sent: string[]): GatewayClient {
  return {
    envId,
    connId,
    ws: {
      readyState: WebSocket.OPEN,
      send(data: string) {
        sent.push(data);
      },
    } as unknown as WebSocket,
  };
}

describe("connections", () => {
  afterEach(() => {
    clearClients();
  });

  it("tracks clients per environment", () => {
    addClient(fakeClient("env_a", "c1", []));
    addClient(fakeClient("env_a", "c2", []));
    addClient(fakeClient("env_b", "c3", []));

    assert.equal(hasClients("env_a"), true);
    assert.equal([...getClients("env_a")].length, 2);

    removeClient("env_a", "c1");
    assert.equal([...getClients("env_a")].length, 1);

    removeClient("env_a", "c2");
    assert.equal(hasClients("env_a"), false);
    assert.equal(hasClients("env_b"), true);
  });

  it("broadcasts only to sockets of that environment", () => {
    const envA: string[] = [];
    const envB: string[] = [];
    addClient(fakeClient("env_a", "c1", envA));
    addClient(fakeClient("env_b", "c2", envB));

    broadcast("env_a", "{\"type\":\"snapshot\"}");

    assert.deepEqual(envA, ["{\"type\":\"snapshot\"}"]);
    assert.deepEqual(envB, []);
  });
});
