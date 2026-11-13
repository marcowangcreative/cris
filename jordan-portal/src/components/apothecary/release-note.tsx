"use client";

import { useEffect, useState } from "react";

export function ReleaseCountdown({ target, label }: { target: string; label: string }) {
  const [parts, setParts] = useState(() => split(target));
  useEffect(() => {
    const id = window.setInterval(() => setParts(split(target)), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  return (
    <div className="rx-center">
      <p className="rx-jost">Next release</p>
      <p className="rx-italic" style={{ marginTop: "0.4rem" }}>
        {label}
      </p>
      <p className="rx-count" aria-live="polite" suppressHydrationWarning>
        {parts.days}d {parts.hours}h {parts.minutes}m
      </p>
    </div>
  );
}

function split(target: string) {
  const minutes = Math.floor(Math.max(0, new Date(target).getTime() - Date.now()) / 60000);
  return {
    days: Math.floor(minutes / (60 * 24)),
    hours: Math.floor(minutes / 60) % 24,
    minutes: minutes % 60,
  };
}

export function FirstAccessForm() {
  const [email, setEmail] = useState<string | null>(null);
  if (email) {
    return (
      <p className="rx-italic rx-center">
        Noted for {email}. This demo does not send mail.
      </p>
    );
  }
  return (
    <form
      className="rx-signup"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = String(data.get("email") ?? "").trim();
        if (value.includes("@")) setEmail(value);
      }}
    >
      <label className="rx-jost" htmlFor="first-access">
        First access
      </label>
      <input id="first-access" name="email" type="email" required placeholder="you@example.com" />
      <button className="rx-button" type="submit">
        Write me
      </button>
    </form>
  );
}
