import { useState } from "react";
import type { CreateFlagInput, FlagType } from "../../types/flare";

type CreateFlagFormProps = { onCreate: (input: CreateFlagInput) => Promise<void> };

export function CreateFlagForm({ onCreate }: CreateFlagFormProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<CreateFlagInput>({ key: "", name: "", description: "", type: "BOOLEAN" });
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await onCreate(input);
      setInput({ key: "", name: "", description: "", type: "BOOLEAN" });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create flag");
    }
  }

  if (!open) return <button className="primary-button" onClick={() => setOpen(true)} type="button">+ New flag</button>;

  return <form className="create-form" onSubmit={submit}>
    <input aria-label="Flag key" onChange={(event) => setInput({ ...input, key: event.target.value })} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="flag-key" required value={input.key} />
    <input aria-label="Flag name" onChange={(event) => setInput({ ...input, name: event.target.value })} placeholder="Flag name" required value={input.name} />
    <select aria-label="Flag type" onChange={(event) => setInput({ ...input, type: event.target.value as FlagType })} value={input.type}><option value="BOOLEAN">Boolean</option><option value="PERCENTAGE">Percentage</option><option value="STRING">String</option></select>
    <input aria-label="Flag description" onChange={(event) => setInput({ ...input, description: event.target.value })} placeholder="Description" value={input.description} />
    {error ? <span className="form-error">{error}</span> : null}
    <button className="small-button" type="submit">Create</button><button className="text-button" onClick={() => setOpen(false)} type="button">Cancel</button>
  </form>;
}
