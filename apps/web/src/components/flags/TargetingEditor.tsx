import { useState } from "react";
import type { FlagState, RuleInput } from "../../types/flare";

type TargetingEditorProps = {
  state: FlagState | undefined;
  canEdit: boolean;
  onSave: (rules: RuleInput[]) => Promise<void>;
};

export function TargetingEditor({ state, canEdit, onSave }: TargetingEditorProps) {
  const [ruleType, setRuleType] = useState<"USER_ALLOW" | "USER_DENY">("USER_ALLOW");
  const [userIds, setUserIds] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userRules = state?.rules.filter((rule) => rule.type === "USER_ALLOW" || rule.type === "USER_DENY") ?? [];

  async function addRule() {
    const ids = [...new Set(userIds.split(",").map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      setError("Enter at least one user ID");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const existing: RuleInput[] = state?.rules.map((rule) => ({
        type: rule.type,
        percentage: rule.percentage ?? undefined,
        userIds: rule.userIds,
        value: rule.value ?? undefined,
      })) ?? [];
      await onSave([...existing, { type: ruleType, userIds: ids }]);
      setUserIds("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save targeting rule");
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(index: number) {
    const target = userRules[index];
    if (!target || !state) return;
    const rules = state.rules.filter((rule) => rule.id !== target.id).map((rule) => ({
      type: rule.type,
      percentage: rule.percentage ?? undefined,
      userIds: rule.userIds,
      value: rule.value ?? undefined,
    }));
    setSaving(true);
    setError(null);
    try { await onSave(rules); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove targeting rule"); } finally { setSaving(false); }
  }

  return (
    <details className="targeting-panel">
      <summary>Targeting <span>{userRules.length} user rules</span></summary>
      <div className="targeting-rules">
        {userRules.map((rule, index) => <div className="targeting-rule" key={rule.id}><span>{rule.type === "USER_ALLOW" ? "Allow" : "Deny"}: {rule.userIds.join(", ")}</span>{canEdit ? <button className="danger-button" disabled={saving} onClick={() => void removeRule(index)} type="button">Remove</button> : null}</div>)}
        {canEdit ? <div className="targeting-form"><select aria-label="Targeting rule type" onChange={(event) => setRuleType(event.target.value as "USER_ALLOW" | "USER_DENY")} value={ruleType}><option value="USER_ALLOW">Allow users</option><option value="USER_DENY">Deny users</option></select><input aria-label="Targeting user IDs" disabled={saving} onChange={(event) => setUserIds(event.target.value)} placeholder="user-1, user-2" value={userIds} /><button className="small-button" disabled={saving} onClick={() => void addRule()} type="button">Add rule</button></div> : null}
        {error ? <p className="row-error" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
