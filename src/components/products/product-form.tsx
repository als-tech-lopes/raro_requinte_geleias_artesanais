"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { productSchema, slugify, type ProductFormValues, type ProductValidated } from "@/schemas/product";
import type { Product } from "@/types/product";
import { ProductImagesManager } from "./product-images-manager";

const defaults: ProductFormValues = { name: "", slug: "", short_description: "", description: "", category: "Clássicas", net_weight: 250, unit: "g", sale_price: 0, estimated_cost: 0, stock_quantity: 0, status: "ativo", featured: false, published: false, main_image_path: null, public_ingredients: "", conservation: "", allergens: "", label_notes: "" };

export function ProductForm({ product, submitError, onCancel, onSave }: { product?: Product; submitError?: string | null; onCancel: () => void; onSave: (value: ProductValidated, images: File[]) => Promise<void> }) {
  const [images, setImages] = useState<File[]>([]);
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<ProductFormValues, unknown, ProductValidated>({ resolver: zodResolver(productSchema), defaultValues: product ?? defaults });
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
        <Field label="Nome do produto" error={errors.name?.message}><input className={field} {...register("name")} placeholder="Ex.: Geleia de Morango" /></Field>
        <Field label="Endereço (slug)" error={errors.slug?.message}><input className={field} {...register("slug")} /></Field>
        <div className="sm:col-span-2"><Field label="Descrição curta" error={errors.short_description?.message}><input className={field} {...register("short_description")} placeholder="Resumo que aparecerá nas vitrines" /></Field></div>
        <div className="sm:col-span-2"><Field label="Descrição completa" error={errors.description?.message}><textarea rows={3} className={field} {...register("description")} placeholder="Conte a história, composição e sugestões de uso..." /></Field></div>
        <Field label="Categoria" error={errors.category?.message} hint="Se ainda não existir, a categoria será criada automaticamente."><input className={field} {...register("category")} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Peso líquido" error={errors.net_weight?.message}><input type="number" step="0.01" className={field} {...register("net_weight")} /></Field><Field label="Unidade" error={errors.unit?.message}><select className={field} {...register("unit")}><option>g</option><option>kg</option><option>ml</option><option>L</option><option>unidade</option></select></Field></div>
        <Field label="Preço de venda" error={errors.sale_price?.message}><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8a8178]">R$</span><input type="number" step="0.01" className={`${field} pl-10`} {...register("sale_price")} /></div></Field>
        <Field label="Custo estimado" error={errors.estimated_cost?.message}><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8a8178]">R$</span><input type="number" step="0.01" className={`${field} pl-10`} {...register("estimated_cost")} /></div></Field>
        <Field label="Quantidade disponível" error={errors.stock_quantity?.message}><input type="number" className={field} {...register("stock_quantity")} /></Field>
        <Field label="Status" error={errors.status?.message}><select className={field} {...register("status")}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="esgotado">Esgotado</option></select></Field>
        <label className="flex items-center gap-3 rounded-xl border border-[#e6dbc9] bg-[#f9f3e8] p-4 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#9c2348]" {...register("published")} /><span><strong className="block">Publicar no catálogo</strong><span className="text-[#786f66]">Permite que visitantes encontrem este produto.</span></span></label>
        <label className="flex items-center gap-3 rounded-xl border border-[#e6dbc9] bg-[#f9f3e8] p-4 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#9c2348]" {...register("featured")} /><span><strong className="block">Produto em destaque</strong><span className="text-[#786f66]">Dê mais visibilidade a este sabor na página inicial.</span></span></label>
        <div className="sm:col-span-2"><p className="mb-3 border-b border-[#eadfce] pb-2 font-serif text-xl">Informações públicas de rotulagem</p><p className="mb-4 text-xs leading-5 text-[#81776e]">Preencha somente informações verificadas. A ficha técnica, os custos e as quantidades da receita nunca são publicados.</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Ingredientes exibidos" error={errors.public_ingredients?.message}><textarea rows={3} className={field} {...register("public_ingredients")} placeholder="Ex.: morango, açúcar e limão" /></Field><Field label="Conservação" error={errors.conservation?.message}><textarea rows={3} className={field} {...register("conservation")} placeholder="Orientações fornecidas pelo responsável" /></Field><Field label="Alérgenos" error={errors.allergens?.message}><textarea rows={2} className={field} {...register("allergens")} placeholder="Informe apenas dados confirmados" /></Field><Field label="Outras observações" error={errors.label_notes?.message}><textarea rows={2} className={field} {...register("label_notes")} /></Field></div></div>
        {product && <ProductImagesManager productId={product.id} mainPath={mainImagePath ?? null} onMainChange={path => setValue("main_image_path", path)} />}
        <label className="rounded-xl border border-dashed border-[#cbbba7] bg-white p-5 text-sm sm:col-span-2"><span className="font-semibold">Fotos do produto</span><span className="mt-1 block text-xs font-normal text-[#81776e]">JPG, PNG ou WebP, até 5 MB cada. A primeira será a imagem principal.</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => setImages(Array.from(event.target.files ?? []))} className="mt-3 block w-full text-xs text-[#756b62] file:mr-3 file:rounded-lg file:border-0 file:bg-[#efe6d9] file:px-3 file:py-2 file:font-semibold file:text-[#594d43]" />{images.length > 0 && <span className="mt-2 block text-xs font-normal text-[#3f684e]">{images.length} {images.length === 1 ? "imagem selecionada" : "imagens selecionadas"}</span>}</label>
        <div className="flex justify-end gap-3 border-t border-[#eadfce] pt-5 sm:col-span-2"><button type="button" onClick={onCancel} className="rounded-xl border border-[#d8cbb9] px-5 py-2.5 text-sm font-semibold">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-[#9c2348] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#7f1c3a] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? <><Loader2 className="animate-spin" size={17} />Salvando...</> : <><Save size={17} />Salvar produto</>}</button></div>
      </form>
    </div>
  </section>;
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#4b443e]">{label}{children}{error ? <span className="text-xs font-normal text-red-700">{error}</span> : hint ? <span className="text-xs font-normal text-[#81776e]">{hint}</span> : null}</label>;
}
