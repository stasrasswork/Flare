import { Dashboard } from "./components/dashboard/Dashboard";
import { LoginForm } from "./components/auth/LoginForm";
import { useConnectionCount } from "./hooks/use-connection-count";
import { useFlags } from "./hooks/use-flags";
import { useSession } from "./hooks/use-session";
import { useWorkspace } from "./hooks/use-workspace";

export function App() {
  const session = useSession();
  const workspaceState = useWorkspace(session.user !== null);
  const flagsState = useFlags(workspaceState.workspace?.id);
  const connectionCount = useConnectionCount(workspaceState.workspace?.id, workspaceState.environment?.id);

  if (session.user === null) {
    return <LoginForm error={session.error} loading={session.loading} onSubmit={session.login} />;
  }

  if (workspaceState.loading || !workspaceState.workspace || !workspaceState.environment) {
    return <main className="loading-screen">Loading your workspace...</main>;
  }

  const canEdit = workspaceState.workspace.role === "OWNER" || workspaceState.workspace.role === "ADMIN";
  const environment = workspaceState.environment;

  return (
    <Dashboard
      canEdit={canEdit}
      connectionCount={connectionCount}
      environment={environment}
      flags={flagsState.flags}
      flagsError={flagsState.error}
      flagsLoading={flagsState.loading}
      onEnvironmentChange={(environmentId) => {
        const next = workspaceState.workspace?.environments.find((item) => item.id === environmentId);
        if (next) workspaceState.setEnvironment(next);
      }}
      onFlagUpdate={(flagId, input) => flagsState.updateState(flagId, environment.id, input)}
      onFlagMetadataUpdate={flagsState.update}
      onFlagArchive={flagsState.archive}
      onFlagCreate={flagsState.create}
      onLogout={session.logout}
      user={session.user}
      workspace={workspaceState.workspace}
    />
  );
}
