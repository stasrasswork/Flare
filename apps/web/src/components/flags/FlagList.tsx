import type { Flag, UpdateFlagInput, UpdateFlagStateInput } from "../../types/flare";
import { FlagRow } from "./FlagRow";

type FlagListProps = {
  flags: Flag[];
  workspaceId: string;
  environmentId: string;
  canEdit: boolean;
  loading: boolean;
  error: string | null;
  onUpdate: (flagId: string, input: UpdateFlagStateInput) => Promise<void>;
  onMetadataUpdate: (flagId: string, input: UpdateFlagInput) => Promise<void>;
  onArchive: (flagId: string) => Promise<void>;
};

export function FlagList({ flags, workspaceId, environmentId, canEdit, loading, error, onUpdate, onMetadataUpdate, onArchive }: FlagListProps) {
  if (loading) {
    return <div className="empty-state">Loading flags...</div>;
  }
  if (error) {
    return <div className="empty-state error-state" role="alert">{error}</div>;
  }
  if (flags.length === 0) {
    return <div className="empty-state">No flags in this workspace yet.</div>;
  }

  return (
    <div className="flag-list">
      {flags.filter((flag) => !flag.archivedAt).map((flag) => <FlagRow canEdit={canEdit} environmentId={environmentId} flag={flag} key={`${flag.id}:${environmentId}`} onArchive={onArchive} onMetadataUpdate={onMetadataUpdate} onUpdate={onUpdate} workspaceId={workspaceId} />)}
    </div>
  );
}
