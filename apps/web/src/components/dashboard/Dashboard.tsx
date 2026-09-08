import type { CreateFlagInput, User, Workspace, Environment, Flag, UpdateFlagInput, UpdateFlagStateInput } from "../../types/flare";
import { EnvironmentSelector } from "./EnvironmentSelector";
import { StatsBar } from "./StatsBar";
import { FlagList } from "../flags/FlagList";
import { CreateFlagForm } from "../flags/CreateFlagForm";

type DashboardProps = {
  user: User;
  workspace: Workspace;
  environment: Environment;
  flags: Flag[];
  flagsLoading: boolean;
  flagsError: string | null;
  connectionCount: number | null;
  canEdit: boolean;
  onEnvironmentChange: (environmentId: string) => void;
  onFlagUpdate: (flagId: string, input: UpdateFlagStateInput) => Promise<void>;
  onFlagMetadataUpdate: (flagId: string, input: UpdateFlagInput) => Promise<void>;
  onFlagArchive: (flagId: string) => Promise<void>;
  onFlagCreate: (input: CreateFlagInput) => Promise<void>;
  onLogout: () => Promise<void>;
};

export function Dashboard({ user, workspace, environment, flags, flagsLoading, flagsError, connectionCount, canEdit, onEnvironmentChange, onFlagUpdate, onFlagMetadataUpdate, onFlagArchive, onFlagCreate, onLogout }: DashboardProps) {
  const environmentFlags = flags;
  const enabledCount = environmentFlags.filter((flag) => flag.states.find((state) => state.environmentId === environment.id)?.enabled).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">FL</div><div><strong>Flare</strong><span>Control plane</span></div></div>
        <div className="topbar-actions"><div className="user-chip"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span>{user.name}</span></div><button className="text-button" onClick={() => void onLogout()} type="button">Sign out</button></div>
      </header>
      <div className="content-wrap">
        <section className="page-heading"><div><p className="eyebrow">Workspace / {workspace.slug}</p><h1>Feature control</h1><p className="muted">Manage release behavior across your connected applications.</p></div><EnvironmentSelector environments={workspace.environments} onChange={onEnvironmentChange} selectedId={environment.id} /></section>
        <StatsBar connectionCount={connectionCount} enabledCount={enabledCount} flagCount={environmentFlags.filter((flag) => !flag.archivedAt).length} />
        <section className="section-heading"><div><p className="eyebrow">Live configuration</p><h2>{environment.name}</h2></div><div className="section-actions">{canEdit ? <CreateFlagForm onCreate={onFlagCreate} /> : null}<span className="live-indicator"><i /> Polling live status</span></div></section>
        <FlagList canEdit={canEdit} environmentId={environment.id} error={flagsError} flags={environmentFlags} loading={flagsLoading} onArchive={onFlagArchive} onMetadataUpdate={onFlagMetadataUpdate} onUpdate={onFlagUpdate} workspaceId={workspace.id} />
      </div>
    </main>
  );
}
