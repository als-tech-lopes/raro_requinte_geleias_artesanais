"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(!hasSupabaseConfig());

  useEffect(() => {
    if (!hasSupabaseConfig()) return;
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else setReady(true);
    });
  }, [router]);

  if (!ready) return <div className="grid min-h-screen place-items-center bg-[#f7f1e5]"><div className="flex items-center gap-3 text-sm text-[#6f665d]"><Loader2 className="animate-spin" size={20} />Verificando acesso...</div></div>;
  return children;
}
