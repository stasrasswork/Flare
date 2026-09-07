import { useEffect, useState } from "react";
import { flareApi } from "../api/flare-api";

const POLL_INTERVAL_MS = 10_000;

export function useConnectionCount(workspaceId: string | undefined, environmentId: string | undefined) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!workspaceId || !environmentId) {
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const response = await flareApi.getConnectionCount(workspaceId, environmentId);
        if (active) {
          setCount(response.count);
        }
      } catch {
        if (active) {
          setCount(null);
        }
      }
    };

    void load();
    const intervalId = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [environmentId, workspaceId]);

  return count;
}
