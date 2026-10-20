import type { LucideIcon } from "lucide-react";

export function ModulePlaceholder({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return <div className="animate-rise mx-auto max-w-[1320px]"><div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#9c2348]/10 text-[#9c2348]"><Icon size={24} /></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#9c2348]">Módulo administrativo</p><h1 className="font-serif text-4xl">{title}</h1></div></div><section className="mt-8 rounded-[22px] border border-[#e4d8c7] bg-[#fffdf8] p-8 shadow-[0_12px_35px_rgba(62,43,29,.06)]"><h2 className="font-serif text-2xl">Estrutura pronta</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#776e65]">{description}</p><div className="mt-7 h-2 w-28 rounded-full bg-[#9c2348]/15" /></section></div>;
}
