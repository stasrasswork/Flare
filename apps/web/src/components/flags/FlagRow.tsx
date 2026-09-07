import { useState } from "react";
import { getPercentage, getStateForEnvironment, parsePercentage, percentageRules } from "../../lib/flag-state";
import type { Flag, FlagState, UpdateFlagInput, UpdateFlagStateInput } from "../../types/flare";

type FlagRowProps = {
  flag: Flag;
  environmentId: string;
  canEdit: boolean;
  onUpdate: (flagId: string, input: UpdateFlagStateInput) => Promise<void>;
  onMetadataUpdate: (flagId: string, input: UpdateFlagInput) => Promise<void>;
  onArchive: (flagId: string) => Promise<void>;
};

function StateBadge({ state }: { state: FlagState | undefined }) {
  return <span className={`status-badge ${state?.enabled ? "is-on" : "is-off"}`}>{state?.enabled ? "Enabled" : "Off"}</span>;
}

export function FlagRow({ flag, environmentId, canEdit, onUpdate, onMetadataUpdate, onArchive }: FlagRowProps) {
  const state = getStateForEnvironment(flag, environmentId);
  const [percentage, setPercentage] = useState(String(getPercentage(state)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(flag.name);
  const [description, setDescription] = useState(flag.description ?? "");
  const [stringValue, setStringValue] = useState(String(state?.defaultValue ?? ""));

  async function update(input: Parameters<FlagRowProps["onUpdate"]>[1]) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(flag.id, input);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update flag");
    } finally {
      setSaving(false);
    }
  }

  async function handlePercentageSubmit() {
    const value = parsePercentage(percentage);
    if (value === undefined) {
      setError("Enter a whole number from 0 to 100");
      return;
    }
    await update({ rules: percentageRules(value) });
  }

  async function saveMetadata() {
    await onMetadataUpdate(flag.id, { name, description });
    setEditing(false);
  }

  return (
    <article className="flag-row">
      <div className="flag-main">
        <div className="flag-heading">
          <div>
            <p className="flag-key">{flag.key}</p>
            {editing ? <input aria-label={`${flag.key} name`} onChange={(event) => setName(event.target.value)} value={name} /> : <h3>{flag.name}</h3>}
          </div>
          <StateBadge state={state} />
        </div>
        {editing ? <textarea aria-label={`${flag.key} description`} onChange={(event) => setDescription(event.target.value)} value={description} /> : <p className="muted flag-description">{flag.description ?? "No description provided."}</p>}
        <div className="flag-meta"><span>{flag.type}</span><span>Version {state?.version ?? "-"}</span></div>
      </div>
      <div className="flag-control">
        {flag.type === "BOOLEAN" ? (
          <button className={`toggle ${state?.enabled ? "is-on" : ""}`} disabled={!canEdit || saving || !state} onClick={() => void update({ enabled: !state?.enabled })} type="button" aria-label={`${state?.enabled ? "Disable" : "Enable"} ${flag.name}`}>
            <span />
          </button>
        ) : null}
        {flag.type === "PERCENTAGE" ? (
          <div className="percentage-control">
            <div className="percentage-line"><strong>{getPercentage(state)}%</strong><span>rollout</span></div>
            <div className="progress-track"><span style={{ width: `${getPercentage(state)}%` }} /></div>
            <div className="percentage-form">
              <input aria-label={`${flag.name} rollout percentage`} disabled={!canEdit || saving} inputMode="numeric" min="0" max="100" onChange={(event) => setPercentage(event.target.value)} value={percentage} />
              <button className="small-button" disabled={!canEdit || saving} onClick={() => void handlePercentageSubmit()} type="button">Save</button>
            </div>
          </div>
        ) : null}
        {flag.type === "STRING" ? <div className="string-control"><input aria-label={`${flag.name} value`} disabled={!canEdit || saving} onChange={(event) => setStringValue(event.target.value)} value={stringValue} /><button className="small-button" disabled={!canEdit || saving} onClick={() => void update({ defaultValue: stringValue })} type="button">Save</button></div> : null}
      </div>
      {canEdit ? <div className="row-actions"><button className="text-button" disabled={saving} onClick={() => (editing ? void saveMetadata() : setEditing(true))} type="button">{editing ? "Save details" : "Edit details"}</button><button className="danger-button" disabled={saving} onClick={() => { if (window.confirm(`Archive ${flag.name}?`)) void onArchive(flag.id); }} type="button">Archive</button></div> : null}
      {error ? <p className="row-error" role="alert">{error}</p> : null}
    </article>
  );
}
