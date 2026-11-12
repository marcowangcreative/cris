import { parseFormalsPayload } from "@/lib/formals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public anon key from marcowangcreative/formals. Read-only use here. Override with env. */
const DEFAULT_URL = "https://qhdzskmkijxfxxbsotkv.supabase.co";
const DEFAULT_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZHpza21raWp4Znh4YnNvdGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NzEyMzIsImV4cCI6MjA5MjA0NzIzMn0.Rkua9orChlAIcv9zfDHfpitqWKshpP-fDKTElkkB8k4";

const SLUG = /^[a-z0-9-]{3,80}$/;

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim().toLowerCase() ?? "";
  if (!SLUG.test(slug)) {
    return Response.json({ error: "That doesn't look like a formals slug." }, { status: 400 });
  }

  const base = (process.env.FORMALS_SUPABASE_URL || DEFAULT_URL).replace(/\/$/, "");
  const key = process.env.FORMALS_SUPABASE_ANON_KEY || DEFAULT_ANON;
  const endpoint = `${base}/rest/v1/events?slug=eq.${encodeURIComponent(slug)}&select=slug,couple_names,data`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json({ error: "The formals list could not be loaded." }, { status: 502 });
    }
    const rows: unknown = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return Response.json({ error: "No shot list for that slug." }, { status: 404 });
    const parsed = parseFormalsPayload(row);
    if (!parsed) return Response.json({ error: "That shot list was empty." }, { status: 422 });
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "The formals list could not be loaded." }, { status: 502 });
  }
}
