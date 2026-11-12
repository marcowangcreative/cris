"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPending(false);
    if (authError) setError(authError.message);
    else setMessage("Check your email for a sign-in link. It signs you up if you're new.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full border border-line bg-card px-3 py-2"
      />
      <button type="submit" disabled={pending} className="bg-ink px-4 py-2.5 text-sm text-paper disabled:opacity-50">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      {message ? <p className="text-sm text-green-deep">{message}</p> : null}
      {error ? <p className="text-sm text-clay">{error}</p> : null}
    </form>
  );
}
