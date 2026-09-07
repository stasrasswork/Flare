import { useState } from "react";
import type { FormEvent } from "react";

type LoginFormProps = {
  loading: boolean;
  error: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
};

export function LoginForm({ loading, error, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState("admin@flare.local");
  const [password, setPassword] = useState("flare-dev");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(email, password);
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="brand-mark">FL</div>
        <p className="eyebrow">Realtime control plane</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="muted">Sign in to manage feature delivery across your environments.</p>
        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
      <aside className="auth-aside">
        <span className="signal-dot" />
        <p className="eyebrow">Ship with confidence</p>
        <h2>Change behavior without a deploy.</h2>
        <p>Push a kill-switch or rollout adjustment to every connected SDK in real time.</p>
      </aside>
    </main>
  );
}
