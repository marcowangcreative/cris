import fs from "node:fs";
import { readAssetForActor } from "@/lib/domain/access";
import { DomainError } from "@/lib/domain/errors";
import { readDemoDb, safeUploadPath } from "@/lib/demo/store";
import { getActor } from "@/server/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getActor();
  if (!actor) return new Response("Sign in required.", { status: 401 });
  const { id } = await context.params;
  try {
    const asset = readAssetForActor(readDemoDb(), actor, id);
    const bytes = fs.readFileSync(safeUploadPath(asset.storage_path));
    return new Response(bytes, {
      headers: {
        "content-type": asset.content_type,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof DomainError ? error.message : "Not found.";
    const status = message.toLowerCase().includes("forbidden") ? 403 : 404;
    return new Response(message, { status });
  }
}
