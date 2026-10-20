"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { ingredientSchema, type IngredientValidated, type IngredientValues } from "@/schemas/ingredient";
import type { Ingredient, IngredientCategory } from "@/types/ingredient";

const defaults: IngredientValues = { name: "", categoryId: "", unit: "kg", minimumStock: 0, initialQuantity: 0, initialTotalValue: 0, notes: "", active: true };
const field = "w-full rounded-xl border border-[#dfd3c2] bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#9c2348] focus:ring-2 focus:ring-[#9c2348]/10 disabled:bg-[#f2ede5]";

export function IngredientForm({ ingredient, categories, submitError, onCancel, onSave }: { ingredient?: Ingredient; categories: IngredientCategory[]; submitError?: string | null; onCancel: () => void; onSave: (value: IngredientValidated) => Promise<void> }) {
  const initial: IngredientValues = ingredient ? { name: ingredient.name, categoryId: ingredient.categoryId, unit: ingredient.unit, minimumStock: ingredient.minimumStock, initialQuantity: 0, initialTotalValue: 0, notes: ingredient.notes ?? "", active: ingredient.active } : defaults;
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<IngredientValues, unknown, IngredientValidated>({ resolver: zodResolver(ingredientSchema), defaultValues: initial });
  const selectedUnit = useWatch({ control, name: "unit" });

  return <section className="animate-rise mx-auto max-w-4xl">
    <button type="button" onClick={onCancel} className="mb-5 flex items-center gap-2 text-sm font-medium text-[#6f665d] hover:text-[#9c2348]"><ArrowLeft size={17} />Voltar para ingredientes</button>
    <div className="overflow-hidden rounded-[22px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_16px_45px_rgba(69,47,31,.08)]">
      <div className="border-b border-[#eadfce] px-6 py-5 sm:px-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Cadastro simples</p><h1 className="mt-1 font-serif text-3xl">{ingredient ? "Editar ingrediente" : "Novo ingrediente"}</h1><p className="mt-2 text-sm text-[#786f66]">O custo médio e o saldo serão controlados automaticamente.</p></div>
      <form onSubmit={handleSubmit(onSave)} className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        {submitError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:col-span-2">{submitError}</div>}
        <Field label="Nome do ingrediente" error={errors.name?.message}><input autoFocus className={field} {...register("name")} placeholder="Ex.: Morango" /></Field>
        <Field label="Categoria" error={errors.categoryId?.message}><select className={field} {...register("categoryId")}><option value="">Selecione...</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
        <Field label="Unidade de controle" error={errors.unit?.message} hint={ingredient ? "A unidade não pode ser alterada depois do cadastro." : undefined}>{ingredient ? <><div className={`${field} bg-[#f2ede5]`}>{unitLabel(ingredient.unit)}</div><input type="hidden" {...register("unit")} /></> : <select className={field} {...register("unit")}><option value="kg">Quilograma (kg)</option><option value="g">Grama (g)</option><option value="L">Litro (L)</option><option value="ml">Mililitro (ml)</option><option value="unidade">Unidade (un)</option></select>}</Field>
        <Field label="Estoque mínimo" error={errors.minimumStock?.message}><input type="number" min="0" step={selectedUnit === "unidade" ? "1" : "0.001"} className={field} {...register("minimumStock")} /></Field>
        {!ingredient && <><Field label="Quantidade inicial" error={errors.initialQuantity?.message} hint="Deixe zero se ainda não houver estoque."><input type="number" min="0" step={selectedUnit === "unidade" ? "1" : "0.001"} className={field} {...register("initialQuantity")} /></Field><Field label="Valor total pago" error={errors.initialTotalValue?.message}><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#8a8178]">R$</span><input type="number" min="0" step="0.01" className={`${field} pl-10`} {...register("initialTotalValue")} /></div></Field></>}
        <div className="sm:col-span-2"><Field label="Observações" error={errors.notes?.message}><textarea rows={3} className={field} {...register("notes")} placeholder="Informação opcional" /></Field></div>
        {ingredient && <label className="flex items-center gap-3 rounded-xl border border-[#e6dbc9] bg-[#f9f3e8] p-4 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-[#9c2348]" {...register("active")} /><span><strong className="block">Ingrediente ativo</strong><span className="text-xs text-[#786f66]">Desative para impedir o uso em novas operações.</span></span></label>}
        <div className="flex justify-end gap-3 border-t border-[#eadfce] pt-5 sm:col-span-2"><button type="button" onClick={onCancel} className="rounded-xl border border-[#d8cbb9] px-5 py-2.5 text-sm font-semibold">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-[#9c2348] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#7f1c3a] disabled:opacity-60">{isSubmitting ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}{isSubmitting ? "Salvando..." : "Salvar ingrediente"}</button></div>
      </form>
    </div>
  </section>;
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#4b443e]">{label}{children}{error ? <span className="text-xs font-normal text-red-700">{error}</span> : hint ? <span className="text-xs font-normal text-[#81776e]">{hint}</span> : null}</label>;
}

function unitLabel(unit: Ingredient["unit"]) {
  return ({ kg: "Quilograma (kg)", g: "Grama (g)", L: "Litro (L)", ml: "Mililitro (ml)", unidade: "Unidade (un)" } as const)[unit];
}
