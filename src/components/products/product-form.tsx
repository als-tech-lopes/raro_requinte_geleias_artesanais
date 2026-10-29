"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { productSchema, slugify, type ProductFormValues, type ProductValidated } from "@/schemas/product";
import type { Product } from "@/types/product";
import { ProductImagesManager } from "./product-images-manager";

const defaults: ProductFormValues = { name: "", slug: "", short_description: "", description: "", category: "Clássicas", net_weight: 250, unit: "g", sale_price: 0, estimated_cost: 0, stock_quantity: 0, status: "ativo", featured: false, published: false, main_image_path: null, public_ingredients: "", conservation: "", allergens: "", label_notes: "", variations: [{ net_weight: 250, unit: "g", price: 0 }] };

export function ProductForm({ product, submitError, onCancel, onSave }: { product?: Product; submitError?: string | null; onCancel: () => void; onSave: (value: ProductValidated, images: File[]) => Promise<void> }) {
  const [images, setImages] = useState<File[]>([]);
  const [existingImageCount, setExistingImageCount] = useState<number | null>(product ? null : 0);
  const [imageError, setImageError] = useState<string | null>(null);
  const initialValues = product ? { ...product, variations: product.variations.length ? product.variations : [{ net_weight: product.net_weight, unit: product.unit, price: product.sale_price }] } : defaults;
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<ProductFormValues, unknown, ProductValidated>({ resolver: zodResolver(productSchema), defaultValues: initialValues });
  const { fields: variations, append, remove } = useFieldArray({ control, name: "variations" });
  const name = useWatch({ control, name: "name" });
  const mainImagePath = useWatch({ control, name: "main_image_path" });
  useEffect(() => { if (!product) setValue("slug", slugify(name)); }, [name, product, setValue]);
  const field = "w-full rounded-xl border border-[#dfd3c2] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9c2348] focus:ring-2 focus:ring-[#9c2348]/10";
  return <section className="animate-rise mx-auto max-w-4xl">
    <button onClick={onCancel} className="mb-5 flex items-center gap-2 text-sm font-medium text-[#6f665d] hover:text-[#9c2348]"><ArrowLeft size={17} />Voltar para produtos</button>
    <div className="overflow-hidden rounded-[22px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_16px_45px_rgba(69,47,31,.08)]">
      <div className="border-b border-[#eadfce] px-6 py-5 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Cadastro</p><h2 className="mt-1 font-serif text-3xl">{product ? "Editar produto" : "Novo produto"}</h2><p className="mt-1 text-sm text-[#786f66]">Informações usadas na operação e, quando ativo, no catálogo público.</p></div>
      <form onSubmit={handleSubmit(value => onSave(value, images))} className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        {submitError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 sm:col-span-2"><strong className="block">Não foi possível salvar o produto.</strong>{submitError}</div>}
        <input type="hidden" {...register("slug")} />
        <input type="hidden" {...register("description")} />
        <input type="hidden" {...register("public_ingredients")} />
        <input type="hidden" {...register("conservation")} />
        <input type="hidden" {...register("allergens")} />
        <input type="hidden" {...register("label_notes")} />
        <Field label="Nome do produto" error={errors.name?.message}><input className={field} {...register("name")} placeholder="Ex.: Geleia de Morango" /></Field>
        <Field label="Descrição curta (opcional)" error={errors.short_description?.message}><input className={field} {...register("short_description")} placeholder="Resumo que aparecerá nas vitrines" /></Field>
        <Field label="Categoria" error={errors.category?.message} hint="Se ainda não existir, a categoria será criada automaticamente."><input className={field} {...register("category")} /></Field>
        <input type="hidden" {...register("net_weight")} /><input type="hidden" {...register("unit")} /><input type="hidden" {...register("sale_price")} />
        <div className="rounded-xl border border-[#e6dbc9] bg-[#f9f3e8] p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-3"><div><strong className="text-sm">Tamanhos e preços</strong><p className="mt-1 text-xs text-[#786f66]">Informe o valor de venda de cada tamanho de pote.</p></div><button type="button" onClick={() => append({ net_weight: 250, unit: "g", price: 0 })} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8cbb9] bg-white px-3 py-2 text-xs font-bold"><Plus size={15} />Adicionar tamanho</button></div>
          <div className="mt-4 space-y-3">{variations.map((variation, index) => <div key={variation.id} className="grid grid-cols-[1fr_100px_1fr_auto] gap-2"><Field label="Tamanho" error={errors.variations?.[index]?.net_weight?.message}><input type="number" min="0.001" step="0.001" className={field} {...register(`variations.${index}.net_weight`)} /></Field><Field label="Unidade" error={errors.variations?.[index]?.unit?.message}><select className={field} {...register(`variations.${index}.unit`)}><option>g</option><option>kg</option><option>ml</option><option>L</option><option>unidade</option></select></Field><Field label="Preço" error={errors.variations?.[index]?.price?.message}><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8a8178]">R$</span><input type="number" min="0" step="0.01" className={`${field} pl-9`} {...register(`variations.${index}.price`)} /></div></Field><button type="button" aria-label="Remover tamanho" disabled={variations.length === 1} onClick={() => remove(index)} className="mt-6 rounded-lg p-2 text-red-700 disabled:opacity-30"><Trash2 size={17} /></button></div>)}</div>
          {typeof errors.variations?.message === "string" && <p className="mt-2 text-xs text-red-700">{errors.variations.message}</p>}
        </div>
        <Field label="Custo estimado" error={errors.estimated_cost?.message}><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8a8178]">R$</span><input type="number" step="0.01" className={`${field} pl-10`} {...register("estimated_cost")} /></div></Field>
        <Field label="Quantidade disponível" error={errors.stock_quantity?.message}><input type="number" className={field} {...register("stock_quantity")} /></Field>
        <Field label="Status" error={errors.status?.message}><select className={field} {...register("status")}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="esgotado">Esgotado</option></select></Field>
        <label className="flex items-center gap-3 rounded-xl border border-[#e6dbc9] bg-[#f9f3e8] p-4 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#9c2348]" {...register("published")} /><span><strong className="block">Publicar no catálogo</strong><span className="text-[#786f66]">Permite que visitantes encontrem este produto.</span></span></label>
        <label className="flex items-center gap-3 rounded-xl border border-[#e6dbc9] bg-[#f9f3e8] p-4 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#9c2348]" {...register("featured")} /><span><strong className="block">Produto em destaque</strong><span className="text-[#786f66]">Dê mais visibilidade a este sabor na página inicial.</span></span></label>
        {product && <ProductImagesManager productId={product.id} mainPath={mainImagePath ?? null} onMainChange={path => setValue("main_image_path", path)} onCountChange={setExistingImageCount} />}
        <label className="rounded-xl border border-dashed border-[#cbbba7] bg-white p-5 text-sm sm:col-span-2"><span className="font-semibold">Fotos do produto</span><span className="mt-1 block text-xs font-normal text-[#81776e]">Insira até 2 imagens por produto, em JPG, PNG ou WebP, com até 5 MB cada. A primeira será a imagem principal.</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={existingImageCount === null || existingImageCount >= 2} onChange={event => { const selected = Array.from(event.target.files ?? []); const available = Math.max(0, 2 - (existingImageCount ?? 0)); if (selected.length > available) { setImages([]); setImageError(`Você pode selecionar somente ${available} ${available === 1 ? "imagem" : "imagens"}. O limite por produto é 2.`); event.currentTarget.value = ""; return; } setImageError(null); setImages(selected); }} className="mt-3 block w-full text-xs text-[#756b62] file:mr-3 file:rounded-lg file:border-0 file:bg-[#efe6d9] file:px-3 file:py-2 file:font-semibold file:text-[#594d43] disabled:opacity-50" />{existingImageCount === null && <span className="mt-2 block text-xs font-normal text-[#81776e]">Verificando a galeria cadastrada...</span>}{existingImageCount !== null && existingImageCount >= 2 && <span className="mt-2 block text-xs font-normal text-[#81776e]">O produto já possui o limite de 2 imagens. Remova uma foto da galeria para adicionar outra.</span>}{imageError && <span className="mt-2 block text-xs font-normal text-red-700">{imageError}</span>}{images.length > 0 && <span className="mt-2 block text-xs font-normal text-[#3f684e]">{images.length} {images.length === 1 ? "imagem selecionada" : "imagens selecionadas"}</span>}</label>
        <div className="flex justify-end gap-3 border-t border-[#eadfce] pt-5 sm:col-span-2"><button type="button" onClick={onCancel} className="rounded-xl border border-[#d8cbb9] px-5 py-2.5 text-sm font-semibold">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-[#9c2348] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#7f1c3a] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? <><Loader2 className="animate-spin" size={17} />Salvando...</> : <><Save size={17} />Salvar produto</>}</button></div>
      </form>
    </div>
  </section>;
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#4b443e]">{label}{children}{error ? <span className="text-xs font-normal text-red-700">{error}</span> : hint ? <span className="text-xs font-normal text-[#81776e]">{hint}</span> : null}</label>;
}
