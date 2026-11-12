"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { upsertDemoEvent, demoSessionOn, loadDemo, removeDemoStylist, resetDemo, saveDemo, setDemoSession, upsertDemoStylist } from "@/lib/demo-store";
import { fetchStudio, persistEvent, persistStylist, removeEvent, removeStylist } from "@/lib/remote-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PlannerEvent, StudioData, Stylist } from "@/lib/types";

type Status = "loading" | "signed_out" | "ready";
type Mode = "demo" | "supabase" | null;

interface StudioContextValue {
  status: Status;
  configured: boolean;
  mode: Mode;
  studioName: string;
  email: string | null;
  stylists: Stylist[];
  events: PlannerEvent[];
  error: string | null;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, studioName: string) => Promise<string | null>;
  resetSample: () => void;
  saveEvent: (event: PlannerEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  saveStylist: (stylist: Stylist) => Promise<void>;
  deleteStylist: (id: string) => Promise<void>;
}

const StudioContext = createContext<StudioContextValue | null>(null);

const empty: StudioData = { studioName: "", stylists: [], events: [] };

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<Status>("loading");
  const [mode, setMode] = useState<Mode>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [data, setData] = useState<StudioData>(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      if (demoSessionOn()) {
        setData(loadDemo());
        setMode("demo");
        setStatus("ready");
      } else {
        setStatus("signed_out");
      }
      return;
    }

    let ignore = false;
    const hydrate = async (nextEmail: string | null) => {
      try {
        const studio = await fetchStudio(supabase);
        if (ignore) return;
        setData(studio);
        setEmail(nextEmail);
        setMode("supabase");
        setError(null);
        setStatus("ready");
      } catch (err) {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Could not load the studio");
        setStatus("ready");
        setMode("supabase");
      }
    };

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (ignore) return;
      if (!sessionData.session) {
        setStatus("signed_out");
        return;
      }
      void hydrate(sessionData.session.user.email ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setStatus("signed_out");
        setMode(null);
        setEmail(null);
        return;
      }
      void hydrate(session.user.email ?? null);
    });

    return () => {
      ignore = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<StudioContextValue>(() => {
    const remember = (update: (current: StudioData) => StudioData) => {
      setData((current) => {
        const next = update(current);
        if (mode === "demo") saveDemo(next);
        return next;
      });
    };

    return {
      status,
      configured,
      mode,
      studioName: data.studioName,
      email,
      stylists: data.stylists,
      events: data.events,
      error,
      enterDemo: () => {
        setDemoSession(true);
        setData(loadDemo());
        setMode("demo");
        setEmail(null);
        setError(null);
        setStatus("ready");
      },
      signOut: async () => {
        setDemoSession(false);
        const supabase = getSupabase();
        if (supabase && mode === "supabase") await supabase.auth.signOut();
        setMode(null);
        setEmail(null);
        setStatus("signed_out");
      },
      signIn: async (nextEmail, password) => {
        const supabase = getSupabase();
        if (!supabase) return "Add Supabase keys before signing in. The demo studio works without them.";
        const { error: signError } = await supabase.auth.signInWithPassword({ email: nextEmail, password });
        return signError?.message ?? null;
      },
      signUp: async (nextEmail, password, studioName) => {
        const supabase = getSupabase();
        if (!supabase) return "Add Supabase keys before creating an account.";
        const { data: created, error: signError } = await supabase.auth.signUp({
          email: nextEmail,
          password,
          options: { data: { studio_name: studioName || "My studio" } },
        });
        if (signError) return signError.message;
        if (!created.session) return "Check your email to confirm the studio, then sign in.";
        return null;
      },
      resetSample: () => {
        const next = resetDemo();
        setData(next);
      },
      saveEvent: async (event) => {
        if (mode === "supabase") {
          const supabase = getSupabase();
          if (!supabase) throw new Error("Supabase is not configured");
          await persistEvent(supabase, event);
        }
        remember((current) => upsertDemoEvent(current, event));
      },
      deleteEvent: async (id) => {
        if (mode === "supabase") {
          const supabase = getSupabase();
          if (!supabase) throw new Error("Supabase is not configured");
          await removeEvent(supabase, id);
        }
        remember((current) => ({ ...current, events: current.events.filter((event) => event.id !== id) }));
      },
      saveStylist: async (stylist) => {
        if (mode === "supabase") {
          const supabase = getSupabase();
          if (!supabase) throw new Error("Supabase is not configured");
          await persistStylist(supabase, stylist);
        }
        remember((current) => upsertDemoStylist(current, stylist));
      },
      deleteStylist: async (id) => {
        if (mode === "supabase") {
          const supabase = getSupabase();
          if (!supabase) throw new Error("Supabase is not configured");
          await removeStylist(supabase, id);
        }
        remember((current) => removeDemoStylist(current, id));
      },
    };
  }, [status, configured, mode, email, data, error]);

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error("useStudio must be used inside AuthProvider");
  return value;
}
