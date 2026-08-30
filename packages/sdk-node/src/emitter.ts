type Handler<T> = (payload: T) => void;

export function createEmitter<Events extends Record<string, unknown>>() {
  const listeners = new Map<keyof Events, Set<Handler<unknown>>>();

  return {
    on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(handler as Handler<unknown>);
      return () => {
        set.delete(handler as Handler<unknown>);
      };
    },
    emit<K extends keyof Events>(event: K, payload: Events[K]): void {
      const set = listeners.get(event);
      if (!set) {
        return;
      }
      for (const handler of set) {
        try {
          handler(payload);
        } catch (err) {
          console.error("Flare event handler failed:", err);
        }
      }
    },
    removeAll(): void {
      listeners.clear();
    },
  };
}
