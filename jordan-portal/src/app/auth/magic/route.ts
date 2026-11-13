import { redirect } from "next/navigation";
import { readDemoDb } from "@/lib/demo/store";
import { readMagicLink } from "@/lib/demo/token";
import { setActorCookie } from "@/server/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const email = readMagicLink(token);
  if (!email) redirect("/login?error=That link is invalid or expired.");
  const db = readDemoDb();
  const staff = db.staff.find((item) => item.email.toLowerCase() === email);
  if (staff) {
    await setActorCookie({ role: "admin", staffId: staff.id });
    redirect("/admin");
  }
  const client = db.clients.find((item) => item.email.toLowerCase() === email);
  if (!client) redirect("/login?error=No portal account uses that email.");
  await setActorCookie({ role: "client", clientId: client.id });
  redirect("/portal");
}
