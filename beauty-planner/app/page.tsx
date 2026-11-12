"use client";

import { Dashboard } from "@/components/dashboard";
import { StudioGate } from "@/components/studio-gate";

export default function HomePage() {
  return (
    <StudioGate>
      <Dashboard />
    </StudioGate>
  );
}
