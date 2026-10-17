"use client";

import { Archive, BarChart3, BookOpen, Boxes, Cherry, Factory, LogOut, Menu, MessageSquareQuote, Settings, ShoppingBag, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

const links = [["Visão geral", BarChart3], ["Produtos", Cherry], ["Ingredientes", Boxes], ["Receitas", BookOpen], ["Produção", Factory], ["Clientes", Users], ["Vendas", ShoppingBag], ["Depoimentos", MessageSquareQuote], ["Mídias", Archive]] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  async function signOut() {
    if (hasSupabaseConfig()) await createClient().auth.signOut();
    router.push("/login");
  }
  return <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
    {open && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col bg-[#2c4637] p-5 text-white transition-transform lg:sticky lg:top-0 lg:h-screen ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 font-serif text-xl">RR</div><div><p className="font-serif text-lg leading-none">Geleias</p><p className="mt-1 text-[10px] uppercase tracking-[.24em] text-[#d9c8a8]">Artesanais</p></div></div><button aria-label="Fechar menu" className="lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <nav className="space-y-1">{links.map(([label, Icon]) => <button key={label} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${label === "Produtos" ? "bg-white text-[#2c4637] shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon size={18} strokeWidth={1.8} />{label}</button>)}</nav>
      <div className="mt-auto border-t border-white/10 pt-4"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10"><Settings size={18} />Configurações</button><div className="mt-3 flex items-center gap-3 rounded-xl bg-black/10 p-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#c17460] text-xs font-bold">AL</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Administrador</p><p className="text-xs text-white/50">RR Geleias</p></div><button aria-label="Sair" onClick={signOut} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"><LogOut size={16} /></button></div></div>
    </aside>
    <div className="min-w-0"><header className="flex h-16 items-center justify-between border-b border-[#e7dccb] bg-[#fffdf8]/90 px-5 backdrop-blur lg:px-9"><button aria-label="Abrir menu" className="rounded-lg border border-[#e7dccb] p-2 lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button><p className="hidden text-xs uppercase tracking-[.16em] text-[#756c63] lg:block">Administração</p><div className="flex items-center gap-2 rounded-full border border-[#e7dccb] bg-white px-3 py-1.5 text-xs text-[#5f574f]"><span className="h-2 w-2 rounded-full bg-[#77a36e]" />Operação online</div></header><main className="p-5 lg:p-9">{children}</main></div>
  </div>;
}
