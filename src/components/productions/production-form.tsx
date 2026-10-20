"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { estimateProduction, plannedRecipeItems } from "./production-calculations";
import { productionSchema, type ProductionValidated, type ProductionValues } from "@/schemas/production";
import type { Production, ProductionRecipe, ProductionSaveInput } from "@/types/production";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
const inputClass = "w-full rounded-xl border border-[#ded2c1] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#9c2348] focus:ring-2 focus:ring-[#9c2348]/10";

export function ProductionForm({ production, recipes, onCancel, onSaveDraft, onComplete, onLoss }: {
  production?: Production;
  recipes: ProductionRecipe[];
  onCancel: () => void;
  onSaveDraft: (id: string | null, input: ProductionSaveInput) => Promise<string>;
  onComplete: (id: string, input: ProductionSaveInput) => Promise<void>;
  onLoss: (id: string, input: ProductionSaveInput, reason: string) => Promise<void>;
}) {
  const initialRecipe = recipes.find(item => item.id === production?.recipeId) ?? recipes[0];
  const initialMultiplier = production?.multiplier ?? 1;
  const initialItems = production?.items.map(item => ({ ingredientId: item.ingredientId, used: item.used }))
    ?? (initialRecipe ? plannedRecipeItems(initialRecipe, initialMultiplier).map(item => ({ ingredientId: item.ingredientId, used: item.planned })) : []);
  const defaults: ProductionValues = {
    recipeId: production?.recipeId ?? initialRecipe?.id ?? "",
    multiplier: initialMultiplier,
    productionDate: production?.productionDate ?? localIsoDate(),
    producedQuantity: production?.producedQuantity ?? null,
    expirationDate: production?.expirationDate ?? null,
    finalWeightG: production?.finalWeightG ?? null,
    notes: production?.notes ?? "",
    yieldDifferenceReason: production?.yieldDifferenceReason ?? "",
    items: initialItems,
  };
  const { register, control, setValue, trigger, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductionValues, unknown, ProductionValidated>({ resolver: zodResolver(productionSchema), defaultValues: defaults });
  const values = useWatch({ control });
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState<"draft" | "complete" | "loss">("draft");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedRecipe = recipes.find(item => item.id === values.recipeId);
  const multiplier = Number(values.multiplier ?? 1);
  const estimate = useMemo(() => selectedRecipe ? estimateProduction(selectedRecipe, multiplier, (values.items ?? []).map(item => ({ ingredientId: item?.ingredientId ?? "", used: Number(item?.used ?? 0) }))) : null, [selectedRecipe, multiplier, values.items]);
  const hasShortage = estimate?.items.some(item => item.used > item.stockQuantity) ?? false;

  function selectRecipe(recipeId: string) {
    setValue("recipeId", recipeId, { shouldValidate: true });
    const recipe = recipes.find(item => item.id === recipeId);
    if (recipe) setValue("items", plannedRecipeItems(recipe, multiplier).map(item => ({ ingredientId: item.ingredientId, used: item.planned })), { shouldValidate: true });
  }
  function changeMultiplier(raw: string) {
    const next = Math.max(1, Number(raw) || 1);
    setValue("multiplier", next, { shouldValidate: true });
    if (selectedRecipe) setValue("items", plannedRecipeItems(selectedRecipe, next).map(item => ({ ingredientId: item.ingredientId, used: item.planned })), { shouldValidate: true });
  }
  async function nextStep() {
    const valid = step === 1 ? await trigger(["recipeId", "multiplier", "productionDate", "items"]) : await trigger("items");
    if (valid) setStep(current => Math.min(3, current + 1));
  }
  async function submit(value: ProductionValidated) {
    setSubmitError(null);
    const input: ProductionSaveInput = { ...value, notes: value.notes || null, yieldDifferenceReason: value.yieldDifferenceReason || null };
    try {
      if (intent === "complete") {
        if (!value.producedQuantity) throw new Error("Informe ao menos um pote produzido. Para rendimento zero, cancele a produção e registre a perda nas observações.");
        if (!value.expirationDate) throw new Error("Informe a data de validade antes de concluir.");
        if (hasShortage) throw new Error("O estoque é insuficiente para o consumo real informado.");
        if (!window.confirm(`Confirmar o consumo informado e adicionar ${value.producedQuantity} potes de ${selectedRecipe?.productName ?? "produto"} ao estoque?`)) return;
        await onComplete(production?.id ?? "", input);
      } else if (intent === "loss") {
        const reason = value.yieldDifferenceReason?.trim() || value.notes?.trim();
        if (!reason) throw new Error("Informe o motivo da perda nas observações ou no motivo da diferença.");
        if (!window.confirm("Registrar a perda consumirá os ingredientes informados e não adicionará potes ao estoque. Deseja continuar?")) return;
        await onLoss(production?.id ?? "", input, reason);
      } else {
        await onSaveDraft(production?.id ?? null, input);
      }
    } catch (reason) { setSubmitError(reason instanceof Error ? reason.message : "Não foi possível salvar a produção."); }
  }

  if (!recipes.length) return <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800"><button onClick={onCancel} className="mb-4 flex items-center gap-2 font-semibold"><ArrowLeft size={17} />Voltar</button>Não há receita ativa, associada a um produto e com ingredientes ativos disponível para produção.</div>;

  return <div className="animate-rise mx-auto max-w-5xl">
    <button type="button" onClick={onCancel} className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#6f665d]"><ArrowLeft size={17} />Voltar para produções</button>
    <header className="rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#9c2348]">{production ? "Continuar produção" : "Nova produção"}</p><h1 className="mt-1 font-serif text-3xl">Escolher receita → Conferir ingredientes → Informar resultado</h1><div className="mt-6 grid grid-cols-3 gap-2">{["Seleção", "Ingredientes", "Resultado"].map((label, index) => <div key={label} className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${step === index + 1 ? "bg-[#9c2348] text-white" : step > index + 1 ? "bg-[#dfeade] text-[#315c3e]" : "bg-[#f2eadf] text-[#81776e]"}`}>{step > index + 1 && <Check className="mr-1 inline" size={13} />}{index + 1}. {label}</div>)}</div></header>

    <form onSubmit={handleSubmit(submit)} className="mt-5 space-y-5">
      {step === 1 && <Section title="Escolha a receita" subtitle="O lote será gerado automaticamente ao concluir."><div className="grid gap-4 sm:grid-cols-2"><Field label="Receita" error={errors.recipeId?.message}><select className={inputClass} value={values.recipeId ?? ""} onChange={event => selectRecipe(event.target.value)}><option value="">Selecione...</option>{recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name} · {recipe.productName}</option>)}</select></Field><Field label="Quantidade de receitas" error={errors.multiplier?.message}><input type="number" min="1" step="1" className={inputClass} value={values.multiplier ?? 1} onChange={event => changeMultiplier(event.target.value)} /></Field><Field label="Data da produção" error={errors.productionDate?.message}><input type="date" className={inputClass} {...register("productionDate")} /></Field></div>{selectedRecipe && estimate && <div className="mt-5 grid gap-3 sm:grid-cols-3"><Summary label="Produção esperada" value={`${estimate.expectedJars} potes`} /><Summary label="Geleia esperada" value={`${number.format(estimate.expectedWeightG)} g`} /><Summary label="Custo estimado" value={money.format(estimate.totalCost)} /></div>}</Section>}

      {step === 2 && selectedRecipe && estimate && <Section title="Confira os ingredientes" subtitle="A quantidade utilizada pode ser ajustada sem alterar a receita original."><div className="space-y-3">{estimate.items.map((item, index) => { const shortage = item.used > item.stockQuantity; return <div key={item.ingredientId} className="grid gap-3 rounded-xl border border-[#e8ddcd] bg-[#fcf8f0] p-4 md:grid-cols-[1.25fr_.8fr_.8fr_.8fr]"><div><p className="font-semibold">{item.ingredientName}</p><p className="mt-1 text-xs text-[#81776e]">Previsto: {number.format(item.planned)} {unitShort(item.stockUnit)}</p></div><Field label="Utilizado" error={errors.items?.[index]?.used?.message}><input type="number" min="0" step={item.stockUnit === "unidade" ? "1" : "0.001"} className={inputClass} {...register(`items.${index}.used`)} /></Field><div><p className="text-xs font-bold text-[#756b62]">Disponível</p><p className="mt-2 text-sm font-semibold">{number.format(item.stockQuantity)} {unitShort(item.stockUnit)}</p></div><div><p className="text-xs font-bold text-[#756b62]">Situação</p><span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${shortage ? "bg-red-50 text-red-700" : "bg-[#e7f1e7] text-[#34603c]"}`}>{shortage ? `Faltam ${number.format(item.used - item.stockQuantity)} ${unitShort(item.stockUnit)}` : "Disponível"}</span></div></div>; })}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Summary label="Ingredientes" value={money.format(estimate.ingredientCost)} /><Summary label="Embalagens" value={money.format(estimate.packagingCost)} /><Summary label="Custo direto estimado" value={money.format(estimate.totalCost)} /></div></Section>}

      {step === 3 && selectedRecipe && estimate && <Section title="Informe o resultado" subtitle="O estoque só será movimentado quando você confirmar a conclusão."><div className="grid gap-4 sm:grid-cols-2"><Field label="Potes produzidos" error={errors.producedQuantity?.message}><input type="number" min="0" step="1" className={inputClass} {...register("producedQuantity")} /></Field><Field label="Data de validade" error={errors.expirationDate?.message}><input type="date" min={values.productionDate} className={inputClass} {...register("expirationDate")} /></Field><Field label="Peso final da geleia em gramas (opcional)" error={errors.finalWeightG?.message}><input type="number" min="0" step="0.001" className={inputClass} {...register("finalWeightG")} /></Field><Field label="Motivo da diferença de rendimento (opcional)" error={errors.yieldDifferenceReason?.message}><input className={inputClass} {...register("yieldDifferenceReason")} /></Field><div className="sm:col-span-2"><Field label="Observações" error={errors.notes?.message}><textarea rows={3} className={inputClass} {...register("notes")} /></Field></div></div><ResultSummary planned={estimate.expectedJars} produced={Number(values.producedQuantity ?? 0)} finalWeight={Number(values.finalWeightG ?? 0)} jarWeight={selectedRecipe.jarWeightG} cost={estimate.totalCost} packagingCost={estimate.packagingCost} /></Section>}

      {submitError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{submitError}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={() => step === 1 ? onCancel() : setStep(current => current - 1)} className="flex items-center justify-center gap-2 rounded-xl border border-[#d8cbb9] px-5 py-3 text-sm font-semibold"><ChevronLeft size={17} />{step === 1 ? "Cancelar" : "Voltar"}</button><div className="flex flex-col gap-3 sm:flex-row"><button type="submit" onClick={() => setIntent("draft")} disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-xl border border-[#9c2348] px-5 py-3 text-sm font-bold text-[#9c2348] disabled:opacity-60">{isSubmitting && intent === "draft" ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}Salvar em preparo</button>{step < 3 ? <button type="button" onClick={() => void nextStep()} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3 text-sm font-bold text-white">Continuar<ChevronRight size={17} /></button> : <>{Number(values.producedQuantity ?? 0) === 0 && <button type="submit" onClick={() => setIntent("loss")} disabled={isSubmitting || hasShortage} className="rounded-xl bg-[#a85a2a] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Registrar perda</button>}<button type="submit" onClick={() => setIntent("complete")} disabled={isSubmitting || hasShortage} className="flex items-center justify-center gap-2 rounded-xl bg-[#315c3e] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{isSubmitting && intent === "complete" ? <Loader2 className="animate-spin" size={17} /> : <Check size={17} />}Concluir produção</button></>}</div></div>
    </form>
  </div>;
}

function ResultSummary({ planned, produced, finalWeight, jarWeight, cost, packagingCost }: { planned: number; produced: number; finalWeight: number; jarWeight: number; cost: number; packagingCost: number }) { const packed = produced * jarWeight; return <div className="mt-5 rounded-xl bg-[#edf4ed] p-4 text-sm text-[#315c3e]"><p>Planejado: <strong>{planned} potes</strong> · Produzido: <strong>{produced || "—"}</strong> · Diferença: <strong>{produced ? produced - planned : "—"}</strong></p><p className="mt-1">Custo direto estimado: <strong>{money.format(cost)}</strong>{produced > 0 ? ` · ${money.format(cost / produced)} por pote` : ""}.</p>{packagingCost === 0 && <p className="mt-1 text-xs">O valor considera apenas ingredientes; não há custo de embalagem vinculado à receita.</p>}{finalWeight > 0 && produced > 0 && <p className="mt-1">Peso final informado: {number.format(finalWeight)} g · Total envasado: {number.format(packed)} g · Diferença: {number.format(finalWeight - packed)} g.</p>}</div>; }
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] p-6"><h2 className="font-serif text-2xl">{title}</h2><p className="mb-5 mt-1 text-sm text-[#81776e]">{subtitle}</p>{children}</section>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-[#4b443e]">{label}<div className="mt-1.5">{children}</div>{error && <span className="mt-1 block text-xs font-normal text-red-700">{error}</span>}</label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#e2d6c5] bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#81776e]">{label}</p><p className="mt-2 font-serif text-xl font-semibold">{value}</p></div>; }
function unitShort(unit: string) { return unit === "unidade" ? "un" : unit; }
function localIsoDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
