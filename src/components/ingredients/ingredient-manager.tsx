"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Boxes, ChevronDown, Edit3, History, Loader2, MoreVertical, Plus, Power, Search, ShoppingCart, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { IngredientForm } from "./ingredient-form";
import { adjustmentSchema, purchaseSchema, type AdjustmentValidated, type AdjustmentValues, type IngredientValidated, type PurchaseValidated, type PurchaseValues } from "@/schemas/ingredient";
import { adjustIngredientStock, createIngredient, deleteIngredient, inactivateIngredient, listIngredientCategories, listIngredientMovements, listIngredients, registerIngredientPurchase, updateIngredient } from "@/services/ingredients";
import type { Ingredient, IngredientCategory, IngredientMovement, MeasurementUnit } from "@/types/ingredient";

type View = { type: "list" } | { type: "create" } | { type: "edit"; ingredient: Ingredient };
type Operation = { type: "purchase" | "adjust" | "history" | "delete"; ingredient: Ingredient } | null;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

export function IngredientManager() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<IngredientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ type: "list" });
  const [operation, setOperation] = useState<Operation>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todos");
  const [situation, setSituation] = useState("todos");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const [items, categoryItems] = await Promise.all([listIngredients(), listIngredientCategories()]); setIngredients(items); setCategories(categoryItems); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os ingredientes."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    // A carga inicial sincroniza este cliente com as tabelas protegidas do Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => ingredients.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) && (category === "todos" || item.categoryId === category) && (situation === "todos" || getSituation(item).key === situation)), [ingredients, query, category, situation]);
  const activeCount = ingredients.filter(item => item.active).length;
  const lowCount = ingredients.filter(item => item.active && item.quantity <= item.minimumStock).length;

  async function saveIngredient(value: IngredientValidated) {
    try { if (view.type === "edit") await updateIngredient(view.ingredient.id, value); else await createIngredient(value); await load(); setView({ type: "list" }); showNotice(view.type === "edit" ? "Ingrediente atualizado." : "Ingrediente cadastrado com sucesso."); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar."); }
  }
  function showNotice(message: string) { setNotice(message); setTimeout(() => setNotice(null), 4500); }

  if (view.type !== "list") return <IngredientForm ingredient={view.type === "edit" ? view.ingredient : undefined} categories={categories} submitError={error} onCancel={() => { setError(null); setView({ type: "list" }); }} onSave={saveIngredient} />;

  return <div className="animate-rise mx-auto max-w-[1320px]">
    {notice && <div role="status" className="fixed right-5 top-20 z-[60] max-w-sm rounded-xl bg-[#2c4637] px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    {operation?.type === "purchase" && <PurchaseDialog ingredient={operation.ingredient} onClose={() => setOperation(null)} onSaved={async message => { setOperation(null); await load(); showNotice(message); }} />}
    {operation?.type === "adjust" && <AdjustmentDialog ingredient={operation.ingredient} onClose={() => setOperation(null)} onSaved={async message => { setOperation(null); await load(); showNotice(message); }} />}
    {operation?.type === "history" && <HistoryDialog ingredient={operation.ingredient} onClose={() => setOperation(null)} />}
    {operation?.type === "delete" && <DeleteDialog ingredient={operation.ingredient} onClose={() => setOperation(null)} onDeleted={async () => { setOperation(null); await load(); showNotice("Ingrediente excluído definitivamente."); }} onInactivated={async () => { setOperation(null); await load(); showNotice("Ingrediente inativado. O histórico foi preservado."); }} />}
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]"><Boxes size={14} />Insumos e estoque</div><h1 className="font-serif text-4xl sm:text-5xl">Ingredientes</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#776e65]">Cadastre insumos, registre compras e acompanhe o estoque com custo médio automático.</p></div><button onClick={() => { setError(null); setView({ type: "create" }); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(156,35,72,.22)] hover:bg-[#7e1938]"><Plus size={18} />Novo ingrediente</button></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2"><Metric label="Ingredientes ativos" value={activeCount} icon={Boxes} /><Metric label="Atenção ao estoque" value={lowCount} icon={AlertTriangle} warn={lowCount > 0} /></div>
    {error && view.type === "list" && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="mt-6 overflow-visible rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_12px_35px_rgba(62,43,29,.06)]">
      <div className="grid gap-3 border-b border-[#eadfce] p-4 md:grid-cols-[1.4fr_1fr_1fr]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#948a7f]" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar ingrediente..." className="w-full rounded-xl border border-[#ded2c1] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#9c2348]" /></div><Filter value={category} onChange={setCategory}><option value="todos">Todas as categorias</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Filter><Filter value={situation} onChange={setSituation}><option value="todos">Todas as situações</option><option value="normal">Normal</option><option value="baixo">Estoque baixo</option><option value="zerado">Sem estoque</option></Filter></div>
      <div className="hidden grid-cols-[1.3fr_.9fr_.8fr_.8fr_.75fr_72px] gap-4 border-b border-[#eadfce] bg-[#faf5eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#8b8177] md:grid"><span>Nome</span><span>Categoria</span><span>Estoque atual</span><span>Custo médio</span><span>Situação</span><span /></div>
      {loading ? <div className="flex items-center justify-center gap-3 p-12 text-sm text-[#81776e]"><Loader2 className="animate-spin" size={20} />Carregando ingredientes...</div> : <div className="divide-y divide-[#eee4d5]">{filtered.map(item => <IngredientRow key={item.id} ingredient={item} onEdit={() => { setError(null); setView({ type: "edit", ingredient: item }); }} onOperation={type => setOperation({ type, ingredient: item })} />)}{!filtered.length && <div className="p-12 text-center text-sm text-[#81776e]">Nenhum ingrediente encontrado.</div>}</div>}
      <div className="border-t border-[#eadfce] px-5 py-3 text-xs text-[#81776e]">Exibindo {filtered.length} de {ingredients.length} ingredientes</div>
    </section>
  </div>;
}

function IngredientRow({ ingredient, onEdit, onOperation }: { ingredient: Ingredient; onEdit: () => void; onOperation: (type: "purchase" | "adjust" | "history" | "delete") => void }) {
  const state = getSituation(ingredient);
  return <article className="relative m-3 grid gap-3 rounded-xl border border-[#eadfce] p-4 md:m-0 md:grid-cols-[1.3fr_.9fr_.8fr_.8fr_.75fr_72px] md:items-center md:rounded-none md:border-0 md:px-5"><div><p className="font-serif text-lg font-semibold">{ingredient.name}</p><p className="mt-0.5 text-xs text-[#8b8177]">{unitName(ingredient.unit)}{!ingredient.active && " · Inativo"}</p></div><p className="text-sm text-[#645c55]"><span className="mr-1 font-semibold md:hidden">Categoria:</span>{ingredient.categoryName}</p><p className="text-sm font-bold"><span className="mr-1 font-semibold text-[#645c55] md:hidden">Estoque:</span>{formatQuantity(ingredient.quantity, ingredient.unit)}</p><p className="text-sm"><span className="mr-1 font-semibold text-[#645c55] md:hidden">Custo:</span>{money.format(ingredient.averageCost)}<span className="text-xs text-[#8b8177]">/{unitShort(ingredient.unit)}</span></p><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${state.className}`}>{state.label}</span><ActionsMenu canDelete={state.key === "zerado"} onEdit={onEdit} onOperation={onOperation} /></article>;
}

function ActionsMenu({ canDelete, onEdit, onOperation }: { canDelete: boolean; onEdit: () => void; onOperation: (type: "purchase" | "adjust" | "history" | "delete") => void }) {
  return <details className="relative justify-self-end"><summary aria-label="Abrir ações" className="list-none rounded-lg p-2 text-[#756b62] hover:bg-[#eee4d5]"><MoreVertical size={18} /></summary><div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-[#e0d4c3] bg-white p-1.5 shadow-xl"><MenuButton icon={ShoppingCart} label="Registrar compra" onClick={() => onOperation("purchase")} /><MenuButton icon={SlidersHorizontal} label="Ajustar estoque" onClick={() => onOperation("adjust")} /><MenuButton icon={History} label="Ver histórico" onClick={() => onOperation("history")} /><MenuButton icon={Edit3} label="Editar cadastro" onClick={onEdit} />{canDelete && <MenuButton icon={Trash2} label="Excluir ingrediente" danger onClick={() => onOperation("delete")} />}</div></details>;
}

function MenuButton({ icon: Icon, label, danger = false, onClick }: { icon: typeof Edit3; label: string; danger?: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${danger ? "text-red-700 hover:bg-red-50" : "hover:bg-[#f7f1e5]"}`}><Icon size={16} />{label}</button>; }
function Metric({ label, value, icon: Icon, warn }: { label: string; value: number; icon: typeof Boxes; warn?: boolean }) { return <div className="rounded-[18px] border border-[#e4d8c7] bg-[#fffdf8] p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#80766d]">{label}</p><Icon size={18} className={warn ? "text-[#b05b2b]" : "text-[#3f684e]"} /></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
function Filter({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <div className="relative"><select value={value} onChange={event => onChange(event.target.value)} className="w-full appearance-none rounded-xl border border-[#ded2c1] bg-white py-2.5 pl-4 pr-9 text-sm outline-none">{children}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16} /></div>; }

function PurchaseDialog({ ingredient, onClose, onSaved }: { ingredient: Ingredient; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const today = localIsoDate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<PurchaseValues, unknown, PurchaseValidated>({ resolver: zodResolver(purchaseSchema), defaultValues: { quantity: 0, unit: ingredient.unit, totalValue: 0, purchaseDate: today, notes: "" } });
  const bought = Number(useWatch({ control, name: "quantity" }) || 0); const paid = Number(useWatch({ control, name: "totalValue" }) || 0); const unit = useWatch({ control, name: "unit" });
  const converted = convertQuantity(bought, unit, ingredient.unit); const unitCost = converted ? paid / converted : 0;
  async function submit(value: PurchaseValidated) {
    setSubmitError(null);
    try { await registerIngredientPurchase(ingredient.id, value); await onSaved(`Compra registrada! O estoque de ${ingredient.name} foi atualizado.`); }
    catch (reason) { setSubmitError(reason instanceof Error ? reason.message : "Não foi possível registrar a compra."); }
  }
  const incompatibleUnit = converted === null && bought > 0;
  return <Modal title="Registrar compra" subtitle={ingredient.name} onClose={onClose}><form onSubmit={handleSubmit(submit)} className="space-y-4"><div className="grid grid-cols-[1fr_130px] gap-3"><DialogField label="Quantidade" error={errors.quantity?.message}><input type="number" min="0" step="0.001" {...register("quantity")} /></DialogField><DialogField label="Unidade" error={errors.unit?.message}><select {...register("unit")}><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option><option value="unidade">un</option></select></DialogField></div><DialogField label="Valor total pago" error={errors.totalValue?.message}><input type="number" min="0" step="0.01" {...register("totalValue")} /></DialogField><DialogField label="Data da compra" error={errors.purchaseDate?.message}><input type="date" max={today} {...register("purchaseDate")} /></DialogField><DialogField label="Observações" error={errors.notes?.message}><textarea rows={2} {...register("notes")} /></DialogField><div className={`rounded-xl p-4 text-sm ${incompatibleUnit ? "bg-red-50 text-red-700" : "bg-[#f7f1e5]"}`}>{incompatibleUnit ? <p>A unidade da compra não pode ser convertida para {unitName(ingredient.unit).toLowerCase()}.</p> : <><p className="text-[#756b62]">Custo calculado na unidade de estoque</p><p className="mt-1 font-serif text-xl">{money.format(unitCost)}/{unitShort(ingredient.unit)}</p>{converted !== null && unit !== ingredient.unit && <p className="mt-1 text-xs text-[#81776e]">{formatQuantity(bought, unit)} = {formatQuantity(converted, ingredient.unit)}</p>}</>}</div>{submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}<DialogActions busy={isSubmitting} disabled={incompatibleUnit} onClose={onClose} submitLabel="Registrar compra" /></form></Modal>;
}

function AdjustmentDialog({ ingredient, onClose, onSaved }: { ingredient: Ingredient; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AdjustmentValues, unknown, AdjustmentValidated>({ resolver: zodResolver(adjustmentSchema), defaultValues: { newBalance: ingredient.quantity, reason: "Contagem de estoque", notes: "" } });
  async function submit(value: AdjustmentValidated) {
    setSubmitError(null);
    try { await adjustIngredientStock(ingredient.id, value); await onSaved(`Estoque de ${ingredient.name} ajustado com sucesso.`); }
    catch (reason) { setSubmitError(reason instanceof Error ? reason.message : "Não foi possível ajustar o estoque."); }
  }
  return <Modal title="Ajustar estoque" subtitle={`${ingredient.name} · saldo atual ${formatQuantity(ingredient.quantity, ingredient.unit)}`} onClose={onClose}><form onSubmit={handleSubmit(submit)} className="space-y-4"><DialogField label={`Novo saldo (${unitShort(ingredient.unit)})`} error={errors.newBalance?.message}><input type="number" min="0" step={ingredient.unit === "unidade" ? "1" : "0.001"} {...register("newBalance")} /></DialogField><DialogField label="Motivo" error={errors.reason?.message}><select {...register("reason")}><option>Contagem de estoque</option><option>Perda ou desperdício</option><option>Produto vencido</option><option>Correção de cadastro</option><option>Outros</option></select></DialogField><DialogField label="Observações" error={errors.notes?.message}><textarea rows={3} {...register("notes")} /></DialogField><p className="rounded-xl bg-[#fff7df] p-3 text-xs leading-5 text-[#705d2d]">O ajuste preserva o custo médio atual e cria uma nova movimentação no histórico.</p>{submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}<DialogActions busy={isSubmitting} onClose={onClose} submitLabel="Confirmar ajuste" /></form></Modal>;
}

function DeleteDialog({ ingredient, onClose, onDeleted, onInactivated }: { ingredient: Ingredient; onClose: () => void; onDeleted: () => Promise<void>; onInactivated: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    setBusy(true);
    setError(null);
    try { await deleteIngredient(ingredient.id); await onDeleted(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível excluir o ingrediente."); }
    finally { setBusy(false); }
  }
  async function inactivate() {
    setBusy(true);
    setError(null);
    try { await inactivateIngredient(ingredient.id); await onInactivated(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível inativar o ingrediente."); }
    finally { setBusy(false); }
  }
  return <Modal title="Exclusão segura" subtitle={ingredient.name} onClose={busy ? () => undefined : onClose}><div className="space-y-4"><p className="text-sm leading-6 text-[#665e57]">Este ingrediente está sem estoque. Você pode inativá-lo para manter o cadastro ou tentar excluí-lo definitivamente.</p><p className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700">A exclusão será permitida somente quando não houver compras, receitas, produções ou movimentações vinculadas. Ingredientes com histórico devem ser inativados.</p>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex flex-col-reverse gap-3 border-t border-[#eadfce] pt-5 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-[#d8cbb9] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Cancelar</button>{ingredient.active && <button type="button" disabled={busy} onClick={inactivate} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#7e1938] disabled:opacity-60">{busy ? <Loader2 className="animate-spin" size={16} /> : <Power size={16} />}Inativar ingrediente</button>}<button type="button" disabled={busy} onClick={remove} className="flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60">{busy ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}Excluir definitivamente</button></div></div></Modal>;
}

function HistoryDialog({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const [items, setItems] = useState<IngredientMovement[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { listIngredientMovements(ingredient.id).then(setItems).catch(reason => setError(reason instanceof Error ? reason.message : "Não foi possível carregar o histórico.")).finally(() => setLoading(false)); }, [ingredient.id]);
  return <Modal title="Histórico de estoque" subtitle={ingredient.name} onClose={onClose} wide><div className="max-h-[60vh] overflow-y-auto">{loading && <div className="flex justify-center gap-2 p-8 text-sm"><Loader2 className="animate-spin" size={18} />Carregando...</div>}{error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{!loading && !error && !items.length && <p className="p-8 text-center text-sm text-[#81776e]">Nenhuma movimentação registrada.</p>}{items.map(item => <div key={item.id} className="grid gap-2 border-b border-[#eee4d5] py-4 sm:grid-cols-[1fr_.7fr_.7fr]"><div><p className="text-sm font-semibold">{movementLabel(item)}</p><p className="mt-1 text-xs text-[#81776e]">{new Date(item.date).toLocaleString("pt-BR")} · Origem: {originLabel(item.origin)}{item.notes ? ` · ${item.notes}` : ""}</p></div><div><p className={`text-sm font-bold ${item.quantity < 0 ? "text-red-700" : "text-[#3f684e]"}`}>{item.quantity > 0 ? "+" : ""}{formatQuantity(item.quantity, item.unit)}</p><p className="text-xs text-[#81776e]">Movimentação</p></div><div><p className="text-sm font-bold">{formatQuantity(item.balanceAfter, item.unit)}</p><p className="text-xs text-[#81776e]">Saldo posterior</p></div></div>)}</div></Modal>;
}

function Modal({ title, subtitle, onClose, wide, children }: { title: string; subtitle: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 grid place-items-center p-4"><button aria-label="Fechar" className="absolute inset-0 bg-[#211912]/55 backdrop-blur-sm" onClick={onClose} /><section role="dialog" aria-modal="true" className={`relative w-full rounded-[22px] bg-[#fffdf8] p-6 shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}><button type="button" aria-label="Fechar" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 hover:bg-[#eee4d5]"><X size={18} /></button><p className="text-xs font-bold uppercase tracking-[.14em] text-[#9c2348]">{title}</p><h2 className="mb-6 mt-1 pr-8 font-serif text-2xl">{subtitle}</h2>{children}</section></div>; }
function DialogField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold">{label}<div className="mt-1.5 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#ded2c1] [&_input]:bg-white [&_input]:px-3.5 [&_input]:py-2.5 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#ded2c1] [&_select]:bg-white [&_select]:px-3.5 [&_select]:py-2.5 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[#ded2c1] [&_textarea]:bg-white [&_textarea]:px-3.5 [&_textarea]:py-2.5">{children}</div>{error && <span className="mt-1 block text-xs font-normal text-red-700">{error}</span>}</label>; }
function DialogActions({ busy, disabled = false, onClose, submitLabel }: { busy: boolean; disabled?: boolean; onClose: () => void; submitLabel: string }) { return <div className="flex justify-end gap-3 border-t border-[#eadfce] pt-5"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-[#d8cbb9] px-4 py-2.5 text-sm font-semibold">Cancelar</button><button type="submit" disabled={busy || disabled} className="flex items-center gap-2 rounded-xl bg-[#9c2348] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy && <Loader2 className="animate-spin" size={16} />}{submitLabel}</button></div>; }

function getSituation(item: Ingredient) { if (item.quantity === 0) return { key: "zerado", label: "Sem estoque", className: "bg-red-50 text-red-700" }; if (item.quantity <= item.minimumStock) return { key: "baixo", label: "Estoque baixo", className: "bg-[#fff2df] text-[#9a5725]" }; return { key: "normal", label: "Normal", className: "bg-[#e7f1e7] text-[#34603c]" }; }
function unitShort(unit: MeasurementUnit) { return unit === "unidade" ? "un" : unit; }
function unitName(unit: MeasurementUnit) { return ({ kg: "Quilograma", g: "Grama", L: "Litro", ml: "Mililitro", unidade: "Unidade" } as const)[unit]; }
function formatQuantity(value: number, unit: MeasurementUnit) { return `${quantity.format(value)} ${unitShort(unit)}`; }
function convertQuantity(value: number, from: MeasurementUnit, to: MeasurementUnit): number | null { if (from === to) return value; if (from === "kg" && to === "g") return value * 1000; if (from === "g" && to === "kg") return value / 1000; if (from === "L" && to === "ml") return value * 1000; if (from === "ml" && to === "L") return value / 1000; return null; }
function localIsoDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
function movementLabel(item: IngredientMovement) { if (item.origin === "COMPRA") return "Compra"; if (item.origin === "PRODUCAO") return "Consumo na produção"; if (item.type === "AJUSTE") return "Ajuste"; if (item.type === "ENTRADA" && item.notes === "Estoque inicial") return "Estoque inicial"; return item.type.charAt(0) + item.type.slice(1).toLowerCase(); }
function originLabel(origin: IngredientMovement["origin"]) { return ({ MANUAL: "Manual", COMPRA: "Compra", PRODUCAO: "Produção", VENDA: "Venda", CANCELAMENTO: "Cancelamento" } as const)[origin]; }
