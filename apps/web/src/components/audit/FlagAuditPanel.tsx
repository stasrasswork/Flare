import { useFlagAudit } from "../../hooks/use-flag-audit";
import { useState } from "react";

type FlagAuditPanelProps = {
  workspaceId: string;
  flagId: string;
  environmentId: string;
  canEdit: boolean;
};

function actionLabel(action: string) {
  return action.replaceAll("_", " ").toLowerCase();
}

function snapshotSummary(value: unknown) {
  if (!value || typeof value !== "object") return "No snapshot";
  const snapshot = value as { enabled?: boolean; defaultValue?: unknown; version?: number };
  return `v${snapshot.version ?? "-"} · ${snapshot.enabled ? "enabled" : "off"} · default ${String(snapshot.defaultValue ?? "-")}`;
}

export function FlagAuditPanel({ workspaceId, flagId, environmentId, canEdit }: FlagAuditPanelProps) {
  const { events, loading, error, rollback } = useFlagAudit(workspaceId, flagId, environmentId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  async function handleRollback(eventId: string) {
    if (!window.confirm("Restore the state from this audit event?")) return;
    setRollingBack(true);
    setActionError(null);
    try {
      await rollback(eventId);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to rollback flag");
    } finally {
      setRollingBack(false);
    }
  }

  return (
    <details className="audit-panel">
      <summary>Audit history <span>{loading ? "Loading..." : `${events.length} events`}</span></summary>
      {error ? <p className="row-error" role="alert">{error}</p> : null}
      {actionError ? <p className="row-error" role="alert">{actionError}</p> : null}
      {!loading && events.length === 0 ? <p className="muted audit-empty">No state changes recorded yet.</p> : null}
      <div className="audit-list">
        {events.map((event) => (
          <div className="audit-event" key={event.id}>
            <div><strong>{actionLabel(event.action)}</strong><span>{new Date(event.createdAt).toLocaleString()}</span><small>{event.actor?.name ?? "Unknown actor"}</small></div>
            <p>{snapshotSummary(event.before)} → {snapshotSummary(event.after)}</p>
            {canEdit && event.action === "FLAG_STATE_UPDATE" ? <button className="text-button" disabled={rollingBack} onClick={() => void handleRollback(event.id)} type="button">{rollingBack ? "Restoring..." : "Rollback"}</button> : null}
          </div>
        ))}
      </div>
    </details>
  );
}