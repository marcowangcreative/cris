import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, signSession } from "@/lib/demo/token";
import type { Actor } from "@/lib/types";

const COOKIE = "jw_session";

export async function getActor(): Promise<Actor | null> {
  const jar = await cookies();
  return readSession(jar.get(COOKIE)?.value);
}

export async function setActorCookie(actor: Actor): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, signSession(actor), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearActorCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function requireClient(): Promise<Extract<Actor, { role: "client" }>> {
  const actor = await getActor();
  if (!actor || actor.role !== "client") redirect("/login");
  return actor;
}

export async function requireAdmin(): Promise<Extract<Actor, { role: "admin" }>> {
  const actor = await getActor();
  if (!actor || actor.role !== "admin") redirect("/login?next=/admin");
  return actor;
}
