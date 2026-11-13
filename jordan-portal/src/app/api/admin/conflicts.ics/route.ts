import { DateTime } from "luxon";
import { buildConflictIcs } from "@/lib/domain/ics";
import { readDemoDb } from "@/lib/demo/store";
import { getActor } from "@/server/session";

export async function GET() {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") {
    return new Response("Studio sign-in required.", { status: 401 });
  }
  const body = buildConflictIcs(readDemoDb(), DateTime.now());
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": "attachment; filename=studio-conflicts.ics",
      "cache-control": "private, no-store",
    },
  });
}
