import { connectStream, type Stream } from "./stream.js";
import { createEmitter } from "./emitter.js";
import { evaluate, type EvalResult } from "./evaluate.js";
import { FlareAuthError, FlareError, FlareTimeoutError } from "./errors.js";
import type { EvalContext, FlagSnapshot, FlagValue, FlareEvents, FlareOptions } from "./types.js";
import { DEFAULT_TIMEOUT_MS } from "./types.js";
import { streamUrl } from "./url.js";

export class Flare {
  static init(options: FlareOptions): Promise<Flare> {
    const client = new Flare(options);
    return client.start();
  }

  private readonly sdkKey: string;
  private readonly timeoutMs: number;
  private readonly wsUrl: string;
  private readonly emitter = createEmitter<FlareEvents>();
  private snapshot: FlagSnapshot | null = null;
  private stream: Stream | undefined;
  private closed = false;

  private constructor(options: FlareOptions) {
    const sdkKey = options.sdkKey.trim();
    if (!sdkKey) {
      throw new FlareError("sdkKey is required");
    }
    this.sdkKey = sdkKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.wsUrl = streamUrl(options.url);
  }

  get ready(): boolean {
    return this.snapshot !== null;
  }

  get version(): number | null {
    return this.snapshot?.version ?? null;
  }

  isEnabled(flagKey: string, context: EvalContext = {}): boolean {
    return this.evaluateFlag(flagKey, context).value === true;
  }

  getValue<T extends FlagValue>(flagKey: string, fallback: T): T;
  getValue<T extends FlagValue>(flagKey: string, context: EvalContext, fallback: T): T;
  getValue<T extends FlagValue>(flagKey: string, contextOrFallback: EvalContext | T, fallback?: T): T {
    if (fallback === undefined) {
      return this.resolveValue(flagKey, {}, contextOrFallback as T);
    }
    return this.resolveValue(flagKey, contextOrFallback as EvalContext, fallback);
  }

  details(flagKey: string, context: EvalContext = {}): EvalResult & { version: number | null } {
    const result = this.evaluateFlag(flagKey, context);
    return { ...result, version: this.version };
  }

  on<K extends keyof FlareEvents>(event: K, handler: (payload: FlareEvents[K]) => void): () => void {
    return this.emitter.on(event, handler);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.stream?.close();
    this.stream = undefined;
    this.emitter.removeAll();
  }

  private start(): Promise<Flare> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timeout = setTimeout(() => {
        finish(() => reject(new FlareTimeoutError(this.timeoutMs)));
      }, this.timeoutMs);

      const unsubReady = this.emitter.on("ready", () => {
        finish(() => resolve(this));
      });

      const unsubFatal = this.emitter.on("error", ({ error }) => {
        if (error instanceof FlareAuthError) {
          finish(() => reject(error));
        }
      });

      const finish = (done: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        unsubReady();
        unsubFatal();
        if (this.snapshot === null) {
          this.stream?.close();
          this.stream = undefined;
        }
        done();
      };

      this.stream = connectStream({
        sdkKey: this.sdkKey,
        url: this.wsUrl,
        getVersion: () => this.snapshot?.version ?? null,
        handlers: {
          onSnapshot: (snapshot) => this.applySnapshot(snapshot),
          onDisconnect: (code) => {
            this.emitter.emit("disconnect", { code });
          },
          onReconnect: (attempt) => {
            this.emitter.emit("reconnect", { attempt });
          },
          onFatal: (error) => {
            this.emitter.emit("error", { error });
          },
        },
      });
    });
  }

  private applySnapshot(snapshot: FlagSnapshot): void {
    const first = this.snapshot === null;
    if (!first && this.snapshot?.version === snapshot.version) {
      return;
    }
    this.snapshot = snapshot;
    if (first) {
      this.emitter.emit("ready", { version: snapshot.version });
    } else {
      this.emitter.emit("update", { version: snapshot.version });
    }
  }

  private evaluateFlag(flagKey: string, context: EvalContext): EvalResult {
    if (!this.snapshot) {
      return { value: false, reason: "NOT_FOUND" };
    }
    return evaluate(this.snapshot, flagKey, context);
  }

  private resolveValue<T extends FlagValue>(flagKey: string, context: EvalContext, fallback: T): T {
    const result = this.evaluateFlag(flagKey, context);
    if (result.reason === "NOT_FOUND" || typeof result.value !== typeof fallback) {
      return fallback;
    }
    return result.value as T;
  }
}
