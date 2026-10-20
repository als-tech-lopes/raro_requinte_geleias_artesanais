"use client";

import { Archive, BarChart3, BookOpen, Boxes, Cherry, Factory, LogOut, Menu, MessageSquareQuote, Settings, ShoppingBag, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/(admin)/actions";
import type { AdminSession } from "@/types/auth";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/produtos", label: "Produtos", icon: Cherry },
  { href: "/ingredientes", label: "Ingredientes", icon: Boxes },
  { href: "/receitas", label: "Receitas", icon: BookOpen },
  { href: "/producao", label: "Produção", icon: Factory },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/vendas", label: "Vendas", icon: ShoppingBag },
  { href: "/admin/depoimentos", label: "Depoimentos", icon: MessageSquareQuote },
  { href: "/midias", label: "Mídias", icon: Archive },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AdminShell({ admin, children }: { admin: AdminSession; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const initials = admin.profile.nome.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
    {open && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
    <aside aria-label="Navegação administrativa" className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#2c4637] p-5 text-white shadow-2xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="mb-7 flex items-center justify-between"><Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}><div className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 font-serif text-xl">RR</div><div><p className="font-serif text-lg leading-none">Geleias</p><p className="mt-1 text-[10px] uppercase tracking-[.24em] text-[#d9c8a8]">Artesanais</p></div></Link><button type="button" aria-label="Fechar menu" className="rounded-lg p-2 hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white font-semibold text-[#2c4637] shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><Icon size={18} strokeWidth={1.8} />{label}</Link>; })}</nav>
      <div className="mt-auto border-t border-white/10 pt-4"><div className="flex items-center gap-3 rounded-xl bg-black/10 p-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c17460] text-xs font-bold">{initials || "AD"}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{admin.profile.nome}</p><p className="truncate text-xs text-white/50">{admin.email}</p></div><form action={logout}><button aria-label="Sair" title="Sair" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"><LogOut size={16} /></button></form></div></div>
    </aside>
    <div className="min-w-0"><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e7dccb] bg-[#fffdf8]/90 px-5 backdrop-blur lg:px-9"><button type="button" aria-label="Abrir menu" className="rounded-lg border border-[#e7dccb] p-2 lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button><p className="hidden text-xs uppercase tracking-[.16em] text-[#756c63] lg:block">Área administrativa</p><div className="flex items-center gap-2 rounded-full border border-[#e7dccb] bg-white px-3 py-1.5 text-xs text-[#5f574f]"><span className="h-2 w-2 rounded-full bg-[#77a36e]" />Sessão segura</div></header><main className="p-5 lg:p-9">{children}</main></div>
  </div>;
}
