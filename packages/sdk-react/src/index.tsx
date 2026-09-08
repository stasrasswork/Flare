import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

type FlagType = "BOOLEAN" | "PERCENTAGE" | "STRING";
type FlagValue = boolean | number | string;
type Rule = { type: "ALL" | "PERCENTAGE" | "USER_ALLOW" | "USER_DENY"; percentage?: number; userIds?: string[]; value?: FlagValue };
type Flag = { type: FlagType; enabled: boolean; defaultValue: FlagValue; rules: Rule[] };
type Snapshot = { version: number; flags: Record<string, Flag> };
type Context = { userId?: string };
type EvalReason = "NOT_FOUND" | "DISABLED" | "USER_DENY" | "USER_ALLOW" | "PERCENTAGE" | "ALL" | "DEFAULT";
type EvalResult = { value: FlagValue; reason: EvalReason };

type ClientOptions = { sdkKey: string; url: string; reconnect?: boolean };

function bucket(flagKey: string, userId: string): number {
  let hash = 2166136261;
  for (const char of `${flagKey}:${userId}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

function evaluate(snapshot: Snapshot | null, key: string, context: Context = {}): EvalResult {
  const flag = snapshot?.flags[key];
  if (!flag) return { value: false, reason: "NOT_FOUND" };
  if (!flag.enabled) return { value: flag.type === "STRING" ? "" : false, reason: "DISABLED" };
  for (const rule of flag.rules) {
    if (rule.type === "USER_DENY" && context.userId && rule.userIds?.includes(context.userId)) {
      return { value: flag.type === "STRING" ? "" : false, reason: "USER_DENY" };
    }
    if (rule.type === "USER_ALLOW" && context.userId && rule.userIds?.includes(context.userId)) {
      return { value: rule.value ?? (flag.type === "STRING" ? flag.defaultValue : true), reason: "USER_ALLOW" };
    }
    if (rule.type === "PERCENTAGE" && context.userId && rule.percentage !== undefined && bucket(key, context.userId) < rule.percentage) {
      return { value: rule.value ?? (flag.type === "STRING" ? flag.defaultValue : true), reason: "PERCENTAGE" };
    }
    if (rule.type === "ALL") return { value: rule.value ?? (flag.type === "STRING" ? flag.defaultValue : true), reason: "ALL" };
  }
  return { value: flag.defaultValue, reason: "DEFAULT" };
}

function websocketUrl(url: string): string {
  const parsed = new URL(url, window.location.origin);
  parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  parsed.pathname = `${parsed.pathname.replace(/\/$/, "")}/v1/stream`;
  return parsed.toString();
}

class ReactFlareClient {
  private snapshot: Snapshot | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer: number | undefined;
  private closed = false;
  private attempt = 0;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly options: ClientOptions) {}

  connect() {
    this.closed = false;
    this.open();
  }

  close() {
    this.closed = true;
    if (this.reconnectTimer !== undefined) window.clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  evaluate(key: string, context?: Context) {
    return evaluate(this.snapshot, key, context);
  }

  private notify() { for (const listener of this.listeners) listener(); }

  private open() {
    if (this.closed || this.socket) return;
    const socket = new WebSocket(websocketUrl(this.options.url));
    this.socket = socket;
    socket.onopen = () => {
      this.attempt = 0;
      socket.send(JSON.stringify({ type: "hello", sdkKey: this.options.sdkKey, sdk: "react", version: this.snapshot?.version ?? 0 }));
    };
    socket.onmessage = (event) => {
      let message: unknown;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (!message || typeof message !== "object") return;
      const candidate = message as { type?: string; version?: number; flags?: Snapshot["flags"] };
      if (candidate.type !== "snapshot" || typeof candidate.version !== "number" || !candidate.flags) return;
      if (this.snapshot?.version === candidate.version) return;
      this.snapshot = { version: candidate.version, flags: candidate.flags };
      this.notify();
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      if (!this.closed && this.options.reconnect !== false) {
        const delay = Math.min(30_000, 1_000 * 2 ** this.attempt++);
        this.reconnectTimer = window.setTimeout(() => { this.reconnectTimer = undefined; this.open(); }, delay);
      }
    };
    socket.onerror = () => socket.close();
  }
}

const FlareContext = createContext<ReactFlareClient | null>(null);

export type FlareProviderProps = ClientOptions & { children: ReactNode };

export function FlareProvider({ children, sdkKey, url, reconnect = true }: FlareProviderProps) {
  const client = useMemo(() => new ReactFlareClient({ sdkKey, url, reconnect }), [reconnect, sdkKey, url]);
  useEffect(() => {
    client.connect();
    return () => client.close();
  }, [client]);
  return <FlareContext.Provider value={client}>{children}</FlareContext.Provider>;
}

function useClient() {
  const client = useContext(FlareContext);
  if (!client) throw new Error("useFlag must be used inside FlareProvider");
  return client;
}

export function useFlag(key: string, context?: Context): boolean {
  const client = useClient();
  useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  return client.evaluate(key, context).value === true;
}

export function useFlagValue<T extends FlagValue>(key: string, fallback: T, context?: Context): T {
  const client = useClient();
  useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  const result = client.evaluate(key, context);
  return result.reason === "NOT_FOUND" || typeof result.value !== typeof fallback ? fallback : result.value as T;
}

export function useFlagDetails(key: string, context?: Context): EvalResult & { version: number | null } {
  const client = useClient();
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  return { ...client.evaluate(key, context), version: snapshot?.version ?? null };
}

export type { Context as EvalContext, EvalReason, EvalResult, FlagValue };
