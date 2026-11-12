"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "./auth-provider";
import { Button, Field, LoadingMark } from "./ui";

export function LoginScreen() {
  const studio = useStudio();
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studioName, setStudioName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (studio.status === "ready") router.replace("/");
  }, [studio.status, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const message = mode === "sign-in"
      ? await studio.signIn(email.trim(), password)
      : await studio.signUp(email.trim(), password, studioName.trim());
    setPending(false);
    if (message) setError(message);
  }

  if (studio.status === "loading" || studio.status === "ready") return <LoadingMark />;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="kicker">For hair and makeup studios</p>
        <h1>Flowed</h1>
        <p className="lede">Schedule every person in the party backward from ready-by, then share a private link with the couple.</p>
        {!studio.configured ? (
          <>
            <Button onClick={studio.enterDemo} style={{ width: "100%", marginTop: 18 }}>
              Open the demo studio
            </Button>
            <p className="meta">Sample names only. No Supabase keys are configured, so nothing leaves this browser.</p>
            <div className="divider">Accounts</div>
            <p className="meta">Email sign-in turns on after you add a Supabase URL and anon key. See SETUP.md.</p>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)} style={{ marginTop: 18 }}>
            {mode === "create" ? (
              <Field label="Studio name">
                <input value={studioName} onChange={(input) => setStudioName(input.target.value)} placeholder="Hale & Pine" />
              </Field>
            ) : null}
            <div style={{ height: 12 }} />
            <Field label="Email">
              <input type="email" autoComplete="email" required value={email} onChange={(input) => setEmail(input.target.value)} />
            </Field>
            <div style={{ height: 12 }} />
            <Field label="Password">
              <input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(input) => setPassword(input.target.value)} />
            </Field>
            {error ? <p className="error-box" role="alert" style={{ marginTop: 12 }}>{error}</p> : null}
            <Button type="submit" disabled={pending} style={{ width: "100%", marginTop: 16 }}>
              {pending ? "Working…" : mode === "sign-in" ? "Sign in" : "Create studio"}
            </Button>
            <button
              type="button"
              className="btn ghost"
              style={{ width: "100%", marginTop: 8 }}
              onClick={() => setMode(mode === "sign-in" ? "create" : "sign-in")}
            >
              {mode === "sign-in" ? "Need a studio account?" : "Already have an account?"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
