"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Cherry, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

const loginSchema = z.object({ email: z.string().email("Informe um e-mail válido."), password: z.string().min(6, "A senha deve ter ao menos 6 caracteres.") });
type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function login(values: LoginValues) {
    if (!hasSupabaseConfig()) { router.push("/produtos"); return; }
    const { error: authError } = await createClient().auth.signInWithPassword(values);
    if (authError) { setError("E-mail ou senha incorretos."); return; }
    router.push("/produtos");
  }

  return <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-[#2c4637] p-14 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" /><div className="absolute -bottom-32 left-20 h-96 w-96 rounded-full border border-white/10" /><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10 font-serif text-xl">RR</div><div><p className="font-serif text-xl">Geleias Artesanais</p><p className="text-[10px] uppercase tracking-[.22em] text-[#d9c8a8]">Feito em pequenos lotes</p></div></div><div className="relative max-w-lg"><Cherry className="mb-6 text-[#d9a7a2]" size={38} strokeWidth={1.5} /><p className="font-serif text-5xl leading-[1.08]">Cuidado artesanal, gestão sem complicação.</p><p className="mt-5 max-w-md leading-7 text-white/60">Produtos, estoque e operação reunidos em um espaço feito para o ritmo do seu negócio.</p></div><p className="text-xs text-white/35">RR Geleias · Área administrativa</p></section>
    <section className="flex items-center justify-center p-6"><div className="w-full max-w-md rounded-[24px] border border-[#e4d8c7] bg-[#fffdf8] p-7 shadow-[0_18px_50px_rgba(69,47,31,.08)] sm:p-10"><div className="mb-8 lg:hidden"><span className="font-serif text-2xl text-[#2c4637]">RR Geleias</span></div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Bem-vindo de volta</p><h1 className="mt-2 font-serif text-4xl">Acesse sua conta</h1><p className="mt-2 text-sm leading-6 text-[#7c7269]">Entre com o usuário administrativo cadastrado no Supabase.</p>{!hasSupabaseConfig() && <div className="mt-5 rounded-xl bg-[#fff4d5] p-3 text-xs leading-5 text-[#705d2d]">Modo demonstração ativo: qualquer e-mail e senha válida liberam o acesso local.</div>}
      <form onSubmit={handleSubmit(login)} className="mt-7 space-y-5"><label className="block text-sm font-semibold">E-mail<input type="email" {...register("email")} placeholder="voce@empresa.com" className="mt-1.5 w-full rounded-xl border border-[#ded2c1] bg-white px-4 py-3 outline-none focus:border-[#9c2348]" />{errors.email && <span className="mt-1 block text-xs font-normal text-red-700">{errors.email.message}</span>}</label><label className="block text-sm font-semibold">Senha<input type="password" {...register("password")} placeholder="••••••••" className="mt-1.5 w-full rounded-xl border border-[#ded2c1] bg-white px-4 py-3 outline-none focus:border-[#9c2348]" />{errors.password && <span className="mt-1 block text-xs font-normal text-red-700">{errors.password.message}</span>}</label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#7e1938] disabled:opacity-60">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <>Entrar <ArrowRight size={18} /></>}</button></form>
    </div></section>
  </main>;
}
