type StatsBarProps = {
  flagCount: number;
  enabledCount: number;
  connectionCount: number | null;
};

export function StatsBar({ flagCount, enabledCount, connectionCount }: StatsBarProps) {
  return (
    <section className="stats-grid" aria-label="Workspace metrics">
      <div className="stat-card"><span>Active flags</span><strong>{flagCount}</strong><small>In this workspace</small></div>
      <div className="stat-card"><span>Enabled now</span><strong>{enabledCount}</strong><small>Selected environment</small></div>
      <div className="stat-card"><span>SDK connections</span><strong>{connectionCount ?? "-"}</strong><small>Live clients</small></div>
    </section>
  );
}
