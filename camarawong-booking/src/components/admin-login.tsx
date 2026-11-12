"use client";

import { useState, type FormEvent } from "react";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error || "That password does not match.");
      setPending(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <main className="narrow">
      <p className="eyebrow">Staff desk</p>
      <h1>The book.</h1>
      {configured ? (
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="field" htmlFor="password">
            <span>Password</span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="alert" role="alert">{error}</p> : null}
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Checking…" : "Enter"}
          </button>
        </form>
      ) : (
        <p>Set ADMIN_PASSWORD in the environment. It is never stored in the repo.</p>
      )}
    </main>
  );
}
