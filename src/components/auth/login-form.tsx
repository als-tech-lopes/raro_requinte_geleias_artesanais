"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAuthorizedAdmin } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginValues } from "@/schemas/auth";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function login(values: LoginValues) {
    if (!configured) return;
    setError(null);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword(values);

    if (authError || !data.user) {
      setError("E-mail ou senha incorretos.");
      return;
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("ativo, papel").eq("id", data.user.id).maybeSingle();
    if (profileError || !isAuthorizedAdmin(profile)) {
      await supabase.auth.signOut();
      setError("Este usuário não possui acesso administrativo ativo.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return <form onSubmit={handleSubmit(login)} className="mt-7 space-y-5">
    <label className="block text-sm font-semibold">E-mail<input type="email" autoComplete="email" {...register("email")} placeholder="voce@empresa.com" className="mt-1.5 w-full rounded-xl border border-[#ded2c1] bg-white px-4 py-3 outline-none transition focus:border-[#9c2348] focus:ring-2 focus:ring-[#9c2348]/10" />{errors.email && <span className="mt-1 block text-xs font-normal text-red-700">{errors.email.message}</span>}</label>
    <label className="block text-sm font-semibold">Senha<input type="password" autoComplete="current-password" {...register("password")} placeholder="••••••••" className="mt-1.5 w-full rounded-xl border border-[#ded2c1] bg-white px-4 py-3 outline-none transition focus:border-[#9c2348] focus:ring-2 focus:ring-[#9c2348]/10" />{errors.password && <span className="mt-1 block text-xs font-normal text-red-700">{errors.password.message}</span>}</label>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={isSubmitting || !configured} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#7e1938] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <>Entrar <ArrowRight size={18} /></>}</button>
  </form>;
}
