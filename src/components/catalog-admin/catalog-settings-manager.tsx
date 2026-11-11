"use client";
/* eslint-disable react-hooks/incompatible-library */

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Images, ImagePlus, Loader2, Save, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { catalogSettingsSchema, type CatalogSettingsValues } from "@/schemas/catalog";
import { deletePublicAsset, saveCatalogSettings, uploadPublicImage, uploadPublicVideo } from "@/services/catalog-admin";
import { defaultCatalogSettings, getCatalogSettings, publicAssetUrl } from "@/services/catalog";

const input = "w-full rounded-xl border border-[#ded2c1] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#9c2348]";

export function CatalogSettingsManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [removeVideo, setRemoveVideo] = useState(false);
  const { register, reset, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CatalogSettingsValues>({ resolver: zodResolver(catalogSettingsSchema), defaultValues: defaultCatalogSettings });

  useEffect(() => {
    getCatalogSettings().then(reset).catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar as configurações.")).finally(() => setLoading(false));
  }, [reset]);

  async function submit(values: CatalogSettingsValues) {
    setError(null);
    setNotice(null);
    let uploadedVideoPath: string | null = null;
    try {
      const next = { ...values };
      if (files.logo) next.logoPath = await uploadPublicImage(files.logo, "catalogo/logo");
      if (files.banner) next.bannerPath = await uploadPublicImage(files.banner, "catalogo/banner");
      if (files.institutional) next.institutionalImagePath = await uploadPublicImage(files.institutional, "catalogo/institucional");
      if (removeVideo) next.institutionalVideoPath = "";
      if (files.video) {
        uploadedVideoPath = await uploadPublicVideo(files.video, "catalogo/video-institucional");
        next.institutionalVideoPath = uploadedVideoPath;
      }
      await saveCatalogSettings(next);
      const previousVideoPath = values.institutionalVideoPath;
      if (previousVideoPath && previousVideoPath !== next.institutionalVideoPath) void deletePublicAsset(previousVideoPath).catch(() => undefined);
      reset(next);
      setFiles({});
      setRemoveVideo(false);
      setNotice("Configurações salvas. A página pública pode levar até 1 minuto para atualizar.");
      setTimeout(() => setNotice(null), 6000);
    } catch (reason) {
      if (uploadedVideoPath) void deletePublicAsset(uploadedVideoPath).catch(() => undefined);
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar.");
    }
  }

  if (loading) return <div className="flex justify-center gap-2 p-16"><Loader2 className="animate-spin" />Carregando configurações...</div>;

  return <div className="mx-auto max-w-5xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Vitrine pública</p><h1 className="mt-1 font-serif text-4xl">Configurações do catálogo</h1><p className="mt-2 text-sm text-[#756c63]">Conteúdo, contato e aparência sem editar código.</p></div><div className="flex flex-wrap gap-2"><Link href="/midias" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8cbb9] bg-white px-4 py-2.5 text-sm font-bold"><Images size={17} />Gerenciar galeria</Link><Link href="/sobre" target="_blank" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8cbb9] bg-white px-4 py-2.5 text-sm font-bold"><ExternalLink size={17} />Ver “Sobre nós”</Link></div></div>
    {notice && <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</p>}
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <form onSubmit={handleSubmit(submit)} className="mt-7 space-y-5">
      <Section title="Marca e apresentação"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome comercial" error={errors.businessName?.message}><input className={input} {...register("businessName")} /></Field><Field label="Descrição curta" error={errors.shortDescription?.message}><textarea rows={3} className={input} {...register("shortDescription")} /></Field><div className="sm:col-span-2"><Field label="Mensagem principal" error={errors.mainMessage?.message}><textarea rows={2} className={input} {...register("mainMessage")} /></Field></div></div></Section>
      <Section title="Sobre nós"><p className="-mt-2 mb-5 text-sm leading-6 text-[#756c63]">Apresente a essência da empresa em poucas linhas e conte a história completa em texto ou vídeo.</p><div className="grid gap-5"><Field label="Resumo da história" error={errors.historySummary?.message} hint="Este texto ganha destaque no início da página."><textarea rows={4} className={input} {...register("historySummary")} /></Field><Field label="História completa" error={errors.story?.message} hint="Use parágrafos para facilitar a leitura."><textarea rows={8} className={input} {...register("story")} /></Field><VideoField current={watch("institutionalVideoPath")} selectedName={files.video?.name} removed={removeVideo} onChange={(file) => { setFiles((value) => ({ ...value, video: file })); if (file) setRemoveVideo(false); }} onRemove={() => { setFiles((value) => ({ ...value, video: null })); setRemoveVideo(true); }} /></div></Section>
      <Section title="Contato"><div className="grid gap-4 sm:grid-cols-2"><Field label="WhatsApp"><input className={input} {...register("whatsapp")} placeholder="(11) 99999-9999" /></Field><Field label="Instagram"><input className={input} {...register("instagram")} placeholder="@rrgeleias" /></Field><Field label="Cidade"><input className={input} {...register("city")} /></Field><Field label="Estado"><input maxLength={2} className={input} {...register("state")} /></Field><div className="sm:col-span-2"><Field label="Informações de atendimento"><textarea rows={2} className={input} {...register("serviceInfo")} /></Field></div></div></Section>
      <Section title="Aparência e imagens"><div className="grid gap-4 sm:grid-cols-2"><Field label="Cor principal"><div className="flex gap-2"><input type="color" className="h-11 w-14 rounded-lg" {...register("primaryColor")} /><input className={input} {...register("primaryColor")} /></div></Field><Field label="Cor secundária"><div className="flex gap-2"><input type="color" className="h-11 w-14 rounded-lg" {...register("secondaryColor")} /><input className={input} {...register("secondaryColor")} /></div></Field><ImageField label="Logotipo" current={watch("logoPath")} onChange={(file) => setFiles((value) => ({ ...value, logo: file }))} /><ImageField label="Banner principal" current={watch("bannerPath")} onChange={(file) => setFiles((value) => ({ ...value, banner: file }))} /><ImageField label="Imagem institucional / capa do vídeo" current={watch("institutionalImagePath")} onChange={(file) => setFiles((value) => ({ ...value, institutional: file }))} /></div></Section>
      <Section title="O que exibir"><div className="grid gap-3 sm:grid-cols-2">{([ ["showSoldOut", "Produtos esgotados"], ["showPrices", "Preços"], ["whatsappEnabled", "Botões do WhatsApp"], ["showTestimonials", "Depoimentos"], ["showGallery", "Galeria de fotos"] ] as const).map(([name, label]) => <label key={name} className="flex items-center gap-3 rounded-xl border border-[#e4d8c7] bg-white p-4 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-[#9c2348]" {...register(name)} />{label}</label>)}</div></Section>
      <div className="flex justify-end"><button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-[#9c2348] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}Salvar configurações</button></div>
    </form>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] p-6"><h2 className="mb-5 font-serif text-2xl">{title}</h2>{children}</section>; }
function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold">{label}{hint && <span className="ml-2 text-xs font-normal text-[#81776e]">{hint}</span>}<span className="mt-1.5 block">{children}</span>{error && <span className="mt-1 block text-xs font-normal text-red-700">{error}</span>}</label>; }
function ImageField({ label, current, onChange }: { label: string; current: string; onChange: (file: File | null) => void }) { const url = publicAssetUrl("public-media", current); return <label className="rounded-xl border border-dashed border-[#cbbba7] bg-white p-4 text-sm"><span className="flex items-center gap-2 font-semibold"><ImagePlus size={17} />{label}</span>{url && <span role="img" aria-label={label} className="mt-3 block aspect-[3/1] rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${url}")` }} />}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="mt-3 block w-full text-xs" /></label>; }

function VideoField({ current, selectedName, removed, onChange, onRemove }: { current: string; selectedName?: string; removed: boolean; onChange: (file: File | null) => void; onRemove: () => void }) {
  const url = !removed ? publicAssetUrl("public-media", current) : null;
  return <div className="rounded-2xl border border-dashed border-[#cbbba7] bg-white p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><span className="flex items-center gap-2 text-sm font-semibold"><Video size={18} />Vídeo da história</span><p className="mt-1 text-xs leading-5 text-[#81776e]">Envie um MP4 ou WebM de até 50 MB. Para melhor carregamento, prefira vídeo em 1080p, formato horizontal.</p></div>{(url || selectedName) && <button type="button" onClick={onRemove} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"><Trash2 size={15} />Remover vídeo</button>}</div>{url && <video controls preload="metadata" className="mt-4 aspect-video w-full rounded-xl bg-black object-contain"><source src={url} />Seu navegador não consegue reproduzir este vídeo.</video>}{removed && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">O vídeo atual será removido quando as configurações forem salvas.</p>}{selectedName && !removed && <p className="mt-4 rounded-lg bg-green-50 p-3 text-xs text-green-800">Novo arquivo selecionado: <strong>{selectedName}</strong></p>}<input type="file" accept="video/mp4,video/webm" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="mt-4 block w-full text-xs" /></div>;
}
