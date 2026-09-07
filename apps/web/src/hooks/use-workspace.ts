import { useCallback, useEffect, useState } from "react";
import { flareApi } from "../api/flare-api";
import type { Environment, Workspace } from "../types/flare";

export function useWorkspace(enabled: boolean) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await flareApi.getWorkspace();
      setWorkspace(response.workspace);
      setEnvironment((current) =>
        response.workspace.environments.find((item) => item.id === current?.id) ?? response.workspace.environments[0] ?? null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      const taskId = window.setTimeout(() => {
        setWorkspace(null);
        setEnvironment(null);
      }, 0);
      return () => window.clearTimeout(taskId);
    }

    const taskId = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(taskId);
  }, [enabled, loadWorkspace]);

  return { workspace, environment, setEnvironment, loading, error, reload: loadWorkspace };
}
