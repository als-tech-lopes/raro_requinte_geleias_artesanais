"use client";

import { CalendarDays, Images, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CatalogMedia } from "@/types/catalog";
import { PublicImage } from "./public-image";

type GalleryFilter = "TODAS" | "DIVULGACAO" | "PRODUCAO";

const filters: Array<{ value: GalleryFilter; label: string }> = [
  { value: "TODAS", label: "Todas as fotos" },
  { value: "DIVULGACAO", label: "Eventos e novidades" },
  { value: "PRODUCAO", label: "Nosso dia a dia" },
];

export function GalleryBrowser({ media }: { media: CatalogMedia[] }) {
  const [filter, setFilter] = useState<GalleryFilter>("TODAS");
  const [selected, setSelected] = useState<CatalogMedia | null>(null);
  const visible = useMemo(() => media.filter(item => filter === "TODAS" || item.type === filter), [filter, media]);

  useEffect(() => {
    if (!selected) return;
    function close(event: KeyboardEvent) { if (event.key === "Escape") setSelected(null); }
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [selected]);

  return <>
    <div className="flex flex-wrap gap-2" aria-label="Filtrar galeria">
      {filters.map(item => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${filter === item.value ? "bg-[var(--catalog-primary)] text-white shadow-sm" : "border border-[#d9cdbb] bg-[#fffdf8] text-[#625950] hover:border-[var(--catalog-primary)]"}`}>{item.label}</button>)}
    </div>
    {visible.length ? <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
      {visible.map((item, index) => <button key={item.id} type="button" onClick={() => setSelected(item)} className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-[1.4rem] bg-[#e8dece] text-left shadow-[0_10px_28px_rgba(55,39,27,.08)] focus:outline-none focus:ring-2 focus:ring-[var(--catalog-secondary)] focus:ring-offset-2">
        <PublicImage src={item.url} alt={item.alt} className={`w-full transition duration-500 group-hover:scale-[1.03] ${index % 5 === 0 ? "aspect-[4/5]" : index % 3 === 0 ? "aspect-[5/4]" : "aspect-square"}`} />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-5 pb-5 pt-16 text-white"><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-white/70">{categoryLabel(item.type)}</span><span className="mt-1 block font-serif text-xl font-bold">{item.title}</span></span>
      </button>)}
    </div> : <div className="mt-8 rounded-[1.5rem] border border-dashed border-[#cdbda8] bg-[#fffdf8]/60 p-12 text-center"><Images className="mx-auto text-[#a39280]" size={32} /><p className="mt-3 font-serif text-xl font-bold">Ainda não há fotos nesta categoria</p><p className="mt-1 text-sm text-[#756b61]">Novos registros aparecerão aqui assim que forem publicados.</p></div>}
    {selected && <div role="dialog" aria-modal="true" aria-label={selected.title} className="fixed inset-0 z-[80] grid place-items-center bg-[#17130f]/90 p-4 sm:p-8" onClick={() => setSelected(null)}>
      <button type="button" aria-label="Fechar imagem" onClick={() => setSelected(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20 sm:right-7 sm:top-7"><X size={24} /></button>
      <div className="w-full max-w-5xl" onClick={event => event.stopPropagation()}>
        <PublicImage src={selected.url} alt={selected.alt} className="max-h-[76vh] min-h-[50vh] w-full rounded-[1.5rem] bg-contain bg-no-repeat" />
        <div className="mt-4 flex items-start gap-3 text-white"><CalendarDays className="mt-1 shrink-0 text-[#e4c797]" size={18} /><div><p className="text-xs font-bold uppercase tracking-[.16em] text-white/55">{categoryLabel(selected.type)}</p><p className="mt-1 font-serif text-2xl font-bold">{selected.title}</p></div></div>
      </div>
    </div>}
  </>;
}

function categoryLabel(type: CatalogMedia["type"]) {
  if (type === "DIVULGACAO") return "Eventos e novidades";
  if (type === "PRODUCAO") return "Nosso dia a dia";
  return "RR Geleias";
}
