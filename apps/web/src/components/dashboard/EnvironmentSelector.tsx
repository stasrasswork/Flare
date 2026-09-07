import type { Environment } from "../../types/flare";

type EnvironmentSelectorProps = {
  environments: Environment[];
  selectedId: string | undefined;
  onChange: (environmentId: string) => void;
};

export function EnvironmentSelector({ environments, selectedId, onChange }: EnvironmentSelectorProps) {
  return (
    <label className="environment-control">
      <span>Environment</span>
      <select value={selectedId ?? ""} onChange={(event) => onChange(event.target.value)}>
        {environments.map((environment) => (
          <option key={environment.id} value={environment.id}>{environment.name}</option>
        ))}
      </select>
    </label>
  );
}
