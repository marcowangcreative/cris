"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "./auth-provider";
import { LoadingMark } from "./ui";

export function StudioGate({ children }: { children: ReactNode }) {
  const studio = useStudio();
  const router = useRouter();

  useEffect(() => {
    if (studio.status === "signed_out") router.replace("/login");
  }, [studio.status, router]);

  if (studio.status !== "ready") return <LoadingMark />;
  return children;
}
