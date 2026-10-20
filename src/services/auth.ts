import "server-only";

import { redirect } from "next/navigation";
import { isAuthorizedAdmin } from "@/lib/auth/authorization";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AdminSession } from "@/types/auth";

export async function getCurrentAdmin(): Promise<AdminSession | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, papel, ativo, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAuthorizedAdmin(profile)) return null;

  return { userId: user.id, email: user.email ?? "", profile };
}

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}
