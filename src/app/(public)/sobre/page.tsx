import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, Heart, Leaf, Play, Quote, Sparkles } from "lucide-react";
import { PublicImage } from "@/components/catalog/public-image";
import { defaultCatalogSettings, getCatalogMedia, getCatalogSettings, publicAssetUrl } from "@/services/catalog";

export const metadata: Metadata = {
  title: "Sobre nós",
  description: "Conheça a história e o cuidado por trás das nossas geleias artesanais.",
  alternates: { canonical: "/sobre" },
};
export const revalidate = 60;

export default async function AboutPage() {
  const [settings, media] = await Promise.all([
    getCatalogSettings().catch(() => defaultCatalogSettings),
    getCatalogMedia().catch(() => []),
  ]);
  const image = publicAssetUrl("public-media", settings.institutionalImagePath) ?? media.find((item) => item.type === "INSTITUCIONAL")?.url ?? null;
  const video = publicAssetUrl("public-media", settings.institutionalVideoPath);

  return <>
    <section className="relative isolate overflow-hidden bg-[#23382c] text-white">
      <div className="absolute -right-28 -top-28 -z-10 h-96 w-96 rounded-full bg-[var(--catalog-secondary)]/25 blur-3xl" />
      <div className="absolute -bottom-48 -left-20 -z-10 h-96 w-96 rounded-full bg-[#d7b982]/15 blur-3xl" />
      <div className="page-shell grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_.85fr] lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-[#e9cfaa]"><Leaf size={15} />Nossa história</div>
          <h1 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">Todo sabor carrega uma história.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/75 sm:text-lg">{settings.historySummary}</p>
          {video && <a href="#nossa-historia-em-video" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[var(--catalog-secondary)] px-6 py-3.5 text-sm font-bold shadow-xl transition hover:brightness-110"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/15"><Play size={14} fill="currentColor" /></span>Assistir à nossa história<ArrowDown size={16} /></a>}
        </div>
        <aside className="relative rounded-[2rem] border border-white/10 bg-white/[.07] p-6 shadow-2xl backdrop-blur sm:p-8">
          <Quote className="text-[#e9cfaa]" size={34} />
          <p className="mt-5 font-serif text-2xl font-bold leading-snug sm:text-3xl">{settings.businessName}</p>
          <p className="mt-4 text-sm leading-7 text-white/65">{settings.shortDescription}</p>
          <div className="mt-7 h-px bg-white/10" />
          <p className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#e9cfaa]"><Heart size={15} />Feito com propósito</p>
        </aside>
      </div>
    </section>

    {video && <section id="nossa-historia-em-video" className="scroll-mt-28 bg-[#efe5d6]">
      <div className="page-shell py-12 sm:py-16 lg:py-20">
        <div className="mx-auto mb-7 max-w-3xl text-center sm:mb-9">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--catalog-secondary)]">Em primeira pessoa</p>
          <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Conheça quem está por trás de cada receita</h2>
          <p className="mt-4 leading-7 text-[#6b6158]">Uma conversa sobre o começo, as escolhas e o carinho que dão forma à nossa marca.</p>
        </div>
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] bg-[#17251d] p-1.5 shadow-[0_24px_70px_rgba(48,42,34,.25)] sm:rounded-[2rem] sm:p-2">
          <video controls playsInline preload="metadata" poster={image ?? undefined} className="aspect-video w-full rounded-[1.15rem] bg-black object-contain sm:rounded-[1.5rem]">
            <source src={video} />
            Seu navegador não consegue reproduzir este vídeo.
          </video>
        </div>
      </div>
    </section>}

    <section className="page-shell grid items-center gap-9 py-12 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
      <div className="relative flex min-h-64 items-center justify-center rounded-[1.5rem] bg-[#e6dac7] p-4 shadow-xl sm:rounded-[2rem] sm:p-6">
        <div className="absolute -bottom-4 -left-4 h-full w-full rounded-[2rem] bg-[var(--catalog-secondary)]/10" />
        {image ? <img src={image} alt={`História da ${settings.businessName}`} loading="lazy" decoding="async" className="relative z-10 my-4 block h-auto max-h-[34rem] w-auto max-w-[92%] rounded-2xl object-contain sm:max-w-[86%]" /> : <PublicImage src={null} alt={`História da ${settings.businessName}`} className="relative z-10 aspect-[4/5] max-h-[34rem] w-[86%] rounded-[1.5rem] sm:rounded-[2rem]" />}
        <div className="absolute bottom-5 left-5 right-5 z-20 rounded-2xl bg-[#fffdf8]/95 p-4 shadow-lg backdrop-blur sm:bottom-7 sm:left-7 sm:right-auto sm:max-w-xs sm:p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--catalog-secondary)]">Nossa essência</p><p className="mt-2 font-serif text-lg font-bold">Cuidado que se percebe em cada detalhe.</p></div>
      </div>
      <div>
        <Sparkles className="text-[var(--catalog-secondary)]" />
        <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-[var(--catalog-secondary)]">De onde viemos</p>
        <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">A história da {settings.businessName}</h2>
        <div className="mt-6 whitespace-pre-line text-base leading-8 text-[#625950]">{settings.story}</div>
        <div className="mt-8 flex items-start gap-4 rounded-2xl border border-[#e3d7c5] bg-[#fffdf8] p-5"><Heart className="mt-1 shrink-0 text-[var(--catalog-secondary)]" /><p className="text-sm leading-6 text-[#665e56]">{settings.shortDescription}</p></div>
      </div>
    </section>

    <section className="page-shell pb-4 sm:pb-8">
      <div className="overflow-hidden rounded-[1.5rem] bg-[var(--catalog-primary)] px-6 py-9 text-center text-white shadow-xl sm:rounded-[2rem] sm:px-10 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ead2ae]">Da nossa história para a sua mesa</p>
        <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-bold sm:text-4xl">Descubra os sabores que fazem parte dessa jornada.</h2>
        <Link href="/catalogo" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--catalog-secondary)] px-6 py-3.5 text-sm font-bold shadow-lg transition hover:brightness-110">Conhecer nossas geleias<ArrowRight size={18} /></Link>
      </div>
    </section>
  </>;
}
