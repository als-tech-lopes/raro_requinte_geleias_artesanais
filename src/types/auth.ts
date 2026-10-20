import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

export type AdminSession = {
  userId: string;
  email: string;
  profile: Profile;
};
