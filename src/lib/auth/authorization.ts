import type { Profile } from "@/types/auth";

export function isAuthorizedAdmin(
  profile: Pick<Profile, "ativo" | "papel"> | null | undefined,
): profile is Pick<Profile, "ativo" | "papel"> {
  return profile?.ativo === true && profile.papel === "ADMIN";
}
