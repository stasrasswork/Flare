import { useCallback, useEffect, useState } from "react";
import { flareApi } from "../api/flare-api";
import type { AuditEvent } from "../types/flare";

export function useFlagAudit(workspaceId: string, flagId: string, environmentId: string) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await flareApi.listAuditEvents(workspaceId, flagId, environmentId);
      setEvents(response.events);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load audit history");
    } finally {
      setLoading(false);
    }
  }, [environmentId, flagId, workspaceId]);

  useEffect(() => {
    const taskId = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(taskId);
  }, [reload]);

  const rollback = useCallback(async (eventId: string) => {
    const response = await flareApi.rollbackFlag(workspaceId, flagId, eventId);
    await reload();
    return response.flag;
  }, [flagId, reload, workspaceId]);

  return { events, loading, error, reload, rollback };
}