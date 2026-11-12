import type { ClientMember, ClientShare, TimelineShare } from "./access";
import { readClientShare, readTimelineShare, writeClientShare } from "./demo-store";
import { fetchClientShare, fetchTimelineShare, persistClientShare } from "./remote-store";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export async function loadClientShare(token: string): Promise<ClientShare | null> {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) return fetchClientShare(supabase, token);
  return readClientShare(token);
}

export async function saveClientShare(token: string, members: readonly ClientMember[]): Promise<void> {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    await persistClientShare(supabase, token, members);
    return;
  }
  const error = writeClientShare(token, members);
  if (error) throw new Error(error);
}

export async function loadTimelineShare(token: string): Promise<TimelineShare | null> {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) return fetchTimelineShare(supabase, token);
  return readTimelineShare(token);
}
