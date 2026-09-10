import { useCallback, useEffect, useState } from "react";
import { flareApi } from "../api/flare-api";
import type { CreateFlagInput, Flag, UpdateFlagInput, UpdateFlagStateInput } from "../types/flare";

export function useFlags(workspaceId: string | undefined) {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setFlags([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await flareApi.listFlags(workspaceId);
      setFlags(response.flags);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load flags");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    const taskId = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(taskId);
  }, [reload]);

  const updateState = useCallback(async (flagId: string, environmentId: string, input: UpdateFlagStateInput) => {
    if (!workspaceId) {
      return;
    }
    const response = await flareApi.updateFlagState(workspaceId, flagId, environmentId, input);
    setFlags((current) => current.map((flag) => (flag.id === response.flag.id ? response.flag : flag)));
  }, [workspaceId]);

  const create = useCallback(async (input: CreateFlagInput) => {
    if (!workspaceId) return;
    const response = await flareApi.createFlag(workspaceId, input);
    setFlags((current) => [...current, response.flag]);
  }, [workspaceId]);

  const update = useCallback(async (flagId: string, input: UpdateFlagInput) => {
    if (!workspaceId) return;
    const response = await flareApi.updateFlag(workspaceId, flagId, input);
    setFlags((current) => current.map((flag) => (flag.id === response.flag.id ? response.flag : flag)));
  }, [workspaceId]);

  const archive = useCallback(async (flagId: string) => {
    if (!workspaceId) return;
    const response = await flareApi.archiveFlag(workspaceId, flagId);
    setFlags((current) => current.filter((flag) => flag.id !== response.flag.id));
  }, [workspaceId]);

  return { flags, loading, error, reload, updateState, create, update, archive };
}
