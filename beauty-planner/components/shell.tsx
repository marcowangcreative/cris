"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useStudio } from "./auth-provider";
import { Button } from "./ui";

export function Shell({
  children,
  actions,
  home = true,
}: {
  children: ReactNode;
  actions?: ReactNode;
  home?: boolean;
}) {
  const studio = useStudio();
  return (
    <>
      {studio.mode === "demo" ? (
        <div className="demo-banner no-print">
          <div className="banner-row">
            <p>
              Demo studio with sample clients only — Avery Chen, Quinn Alvarez, and the Hale &amp; Pine team. Nothing here is a live booking.
            </p>
            <Button variant="ghost" size="small" onClick={studio.resetSample}>
              Reset sample
            </Button>
          </div>
        </div>
      ) : null}
      <header className="topbar no-print">
        <div className="brand">
          {home ? (
            <Link href="/" className="home-link" aria-label="All events">
              <HomeIcon />
            </Link>
          ) : null}
          <div>
            <Link href="/" className="wordmark">
              FLOWED
            </Link>
            <span className="brand-sub">{studio.studioName || "Event beauty planner"}</span>
          </div>
        </div>
        <div className="topbar-actions">
          {actions}
          {studio.status === "ready" ? (
            <Button variant="ghost" size="small" onClick={() => void studio.signOut()}>
              Sign out
            </Button>
          ) : null}
        </div>
      </header>
      {children}
    </>
  );
}

export function PublicBar({ subtitle }: { subtitle: string }) {
  return (
    <header className="topbar no-print">
      <div className="brand">
        <div>
          <span className="wordmark">FLOWED</span>
          <span className="brand-sub">{subtitle}</span>
        </div>
      </div>
    </header>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}
