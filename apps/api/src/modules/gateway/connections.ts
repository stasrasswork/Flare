import { WebSocket } from "ws";

export type GatewayClient = {
  ws: WebSocket;
  connId: string;
  envId: string;
};

const clients = new Map<string, Map<string, GatewayClient>>();

export function addClient(client: GatewayClient): void {
  let byConn = clients.get(client.envId);
  if (!byConn) {
    byConn = new Map();
    clients.set(client.envId, byConn);
  }
  byConn.set(client.connId, client);
}

export function removeClient(envId: string, connId: string): void {
  const byConn = clients.get(envId);
  if (!byConn) {
    return;
  }

  byConn.delete(connId);
  if (byConn.size === 0) {
    clients.delete(envId);
  }
}

export function hasClients(envId: string): boolean {
  return (clients.get(envId)?.size ?? 0) > 0;
}

export function getClients(envId: string): Iterable<GatewayClient> {
  return clients.get(envId)?.values() ?? [];
}

export function broadcast(envId: string, payload: string): void {
  for (const client of getClients(envId)) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

export function clearClients(): void {
  clients.clear();
}
