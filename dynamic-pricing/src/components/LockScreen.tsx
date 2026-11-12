import { useState, type FormEvent } from "react";

const SESSION_KEY = "mwp.pricing.unlockedUntil";

export function hasOpenSession(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw !== null && Number(raw) > Date.now();
  } catch {
    return false;
  }
}

function rememberUnlock(unlockedForMs: number) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(Date.now() + unlockedForMs));
  } catch {
    /* The desk still opens for this page view if storage is blocked. */
  }
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string; unlockedForMs?: number };
      if (!response.ok || !body.ok) {
        setError(
          response.status === 503
            ? "Set PRICING_PASSWORD in the environment before this desk will open. The password is not stored in the source."
            : body.error || "That password does not match.",
        );
        return;
      }
      rememberUnlock(body.unlockedForMs ?? 12 * 60 * 60 * 1000);
      setPassword("");
      onUnlock();
    } catch {
      setError("The desk could not check the password. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="lock-screen" id="main">
      <form className="lock-card" onSubmit={submit}>
        <p className="eyebrow">Marco Wang Photography</p>
        <h1>Revenue desk</h1>
        <p className="lede">Internal quotes only. Couples do not see this, and no price math is published.</p>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="lock-error" role="alert">{error}</p> : null}
        <button className="approve" type="submit" disabled={pending}>
          {pending ? "Checking" : "Open the desk"}
        </button>
      </form>
    </main>
  );
}
