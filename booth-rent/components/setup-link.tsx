"use client";

import { useState } from "react";

export function SetupLinkButton({ stylistId }: { stylistId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setPending(true);
    setError(null);
    setCopied(false);
    const response = await fetch(`/api/stylists/${stylistId}/setup-link`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    setPending(false);
    if (!response.ok || !body?.url) {
      setError(body?.error ?? "Could not create a setup link.");
      return;
    }
    setUrl(body.url);
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={createLink} disabled={pending} className="bg-ink px-4 py-2.5 text-sm text-paper disabled:opacity-50">
        {pending ? "Creating link…" : "Create bank setup link"}
      </button>
      {url ? (
        <div className="space-y-2">
          <label className="block text-sm" htmlFor="setup-url">
            Send this link to the stylist
          </label>
          <div className="flex flex-wrap gap-2">
            <input id="setup-url" readOnly value={url} className="min-w-0 flex-1 border border-line bg-card px-3 py-2 text-sm" />
            <button type="button" onClick={copy} className="border border-ink px-3 py-2 text-sm">
              {copied ? "Copied" : "Copy"}
            </button>
            <a href={url} className="border border-ink px-3 py-2 text-sm">
              Open
            </a>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-clay">{error}</p> : null}
    </div>
  );
}
