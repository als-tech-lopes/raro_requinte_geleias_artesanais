import { ArrowLeft, Cherry } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getCurrentAdmin } from "@/services/auth";

const messages: Record<string, string> = {
  config: "Configure as variáveis públicas do Supabase para habilitar o acesso.",
  session: "Sua sessão expirou. Entre novamente.",
  unauthorized: "Seu usuário não possui acesso administrativo ativo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configured = hasSupabaseConfig();
  if (configured && (await getCurrentAdmin())) redirect("/dashboard");
  const { error } = await searchParams;
  const notice = error ? messages[error] : undefined;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#2c4637] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 left-20 h-96 w-96 rounded-full border border-white/10" />
        <Brand />
        <div className="relative max-w-lg">
          <Cherry className="mb-6 text-[#d9a7a2]" size={38} strokeWidth={1.5} />
          <p className="font-serif text-5xl leading-[1.08]">Cuidado artesanal, gestão sem complicação.</p>
          <p className="mt-5 max-w-md leading-7 text-white/60">Produtos, estoque e operação reunidos em um espaço feito para o ritmo do seu negócio.</p>
        </div>
        <p className="text-xs text-white/35">RR Geleias · Área administrativa</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#2c4637] transition hover:text-[#9c2348]">
            <ArrowLeft size={17} />Voltar para o site
          </Link>
          <div className="rounded-[24px] border border-[#e4d8c7] bg-[#fffdf8] p-7 shadow-[0_18px_50px_rgba(69,47,31,.08)] sm:p-10">
            <div className="mb-8 lg:hidden"><Brand dark /></div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Bem-vindo de volta</p>
            <h1 className="mt-2 font-serif text-4xl">Acesse sua conta</h1>
            <p className="mt-2 text-sm leading-6 text-[#7c7269]">Entre com um usuário administrativo autorizado no Supabase.</p>
            {(!configured || notice) && (
              <p role="status" className="mt-5 rounded-xl border border-[#e8d7a8] bg-[#fff7df] p-3 text-sm leading-5 text-[#705d2d]">
                {notice ?? "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."}
              </p>
            )}
            <LoginForm configured={configured} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className="relative flex items-center gap-3">
      <div className={`grid h-12 w-12 place-items-center rounded-full border font-serif text-xl ${dark ? "border-[#2c4637]/20 bg-[#2c4637]/5 text-[#2c4637]" : "border-white/20 bg-white/10"}`}>RR</div>
      <div>
        <p className={`font-serif text-xl ${dark ? "text-[#2c4637]" : ""}`}>Geleias Artesanais</p>
        <p className={`text-[10px] uppercase tracking-[.22em] ${dark ? "text-[#9c2348]" : "text-[#d9c8a8]"}`}>Feito em pequenos lotes</p>
      </div>
    </div>
  );
}
