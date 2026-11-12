import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, isDemoMode } from "@/lib/config";
import { createDemoRepo } from "@/lib/demo/store";
import { createAdminRepo, createUserRepo } from "@/lib/data/supabase";
import type { AdminRepo, Repo } from "@/lib/data/types";
import type { Salon } from "@/lib/domain";
import { DEMO_OWNER_ID } from "@/lib/demo/seed";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null };

export type OwnerContext = {
  demo: boolean;
  user: SessionUser;
  salon: Salon | null;
  repo: Repo;
};

export const getOwnerContext = cache(async (): Promise<OwnerContext | null> => {
  if (isDemoMode()) {
    const jar = await cookies();
    if (jar.get(DEMO_COOKIE)?.value !== "1") return null;
    const repo = createDemoRepo();
    const user = { id: DEMO_OWNER_ID, email: "owner@lumenroom.example" };
    const salon = await repo.getSalonByOwner(user.id);
    return { demo: true, user, salon, repo };
  }

  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const repo = createUserRepo(supabase);
  const salon = await repo.getSalonByOwner(data.user.id);
  return {
    demo: false,
    user: { id: data.user.id, email: data.user.email ?? null },
    salon,
    repo,
  };
});

export async function requireSalon(): Promise<OwnerContext & { salon: Salon }> {
  const context = await getOwnerContext();
  if (!context) redirect("/login");
  if (!context.salon) redirect("/onboarding");
  return context as OwnerContext & { salon: Salon };
}

export function getAdminRepo(): AdminRepo {
  if (isDemoMode()) return createDemoRepo();
  return createAdminRepo(createSupabaseAdmin());
}
