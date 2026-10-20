"use client";

import { ChefHat, Edit3, Eye, Factory, Loader2, PackageCheck, Plus, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductionDetail, batchState } from "./production-detail";
import { ProductionForm } from "./production-form";
import { cancelProduction, completeProduction, getExpirationAlertDays, listProductionRecipes, listProductions, registerProductionLoss, saveProductionDraft } from "@/services/productions";
import type { Production, ProductionRecipe, ProductionSaveInput, ProductionStatus } from "@/types/production";

type View = { type: "list" } | { type: "form"; production?: Production } | { type: "detail"; production: Production };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProductionManager() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [recipes, setRecipes] = useState<ProductionRecipe[]>([]);
  const [view, setView] = useState<View>({ type: "list" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [alertDays, setAlertDays] = useState(30);
  const [startDate, setStartDate] = useState(""); const [endDate, setEndDate] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("todos"); const [statusFilter, setStatusFilter] = useState("todos");

  async function load() {
    setLoading(true); setError(null);
    try { const [productionData, recipeData, days] = await Promise.all([listProductions(), listProductionRecipes(), getExpirationAlertDays()]); setProductions(productionData); setRecipes(recipeData); setAlertDays(days); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as produções."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  const filtered = useMemo(() => productions.filter(item => (!startDate || item.productionDate >= startDate) && (!endDate || item.productionDate <= endDate) && (recipeFilter === "todos" || item.recipeId === recipeFilter) && (statusFilter === "todos" || item.status === statusFilter)), [productions, startDate, endDate, recipeFilter, statusFilter]);
  const monthPrefix = localIsoDate().slice(0, 7);
  const completedThisMonth = productions.filter(item => item.status === "CONFIRMADA" && item.productionDate.startsWith(monthPrefix));
  function showNotice(message: string) { setNotice(message); setTimeout(() => setNotice(null), 5000); }
  async function saveDraft(id: string | null, input: ProductionSaveInput) { const savedId = await saveProductionDraft(id, input); await load(); setView({ type: "list" }); showNotice("Produção salva em preparo. Nenhum estoque foi alterado."); return savedId; }
  async function finish(id: string, input: ProductionSaveInput) {
    const draftId = await saveProductionDraft(id || null, input);
    const result = await completeProduction(draftId);
    await load(); setView({ type: "list" }); showNotice(`Produção concluída! Foram adicionados ${result.quantidade_produzida} potes ao estoque. Lote ${result.lote}.`);
  }
  async function recordLoss(id: string, input: ProductionSaveInput, reason: string) {
    const draftId = await saveProductionDraft(id || null, { ...input, producedQuantity: 0 });
    await registerProductionLoss(draftId, reason);
    await load(); setView({ type: "list" }); showNotice("Perda registrada. Os ingredientes informados foram baixados e nenhum pote foi adicionado ao estoque.");
  }
  async function cancel(item: Production) {
    const reason = window.prompt("Informe o motivo do cancelamento:");
    if (!reason?.trim()) return;
    try { await cancelProduction(item.id, reason); await load(); showNotice("Produção em preparo cancelada. O estoque não foi alterado."); }
    catch (reasonError) { setError(reasonError instanceof Error ? reasonError.message : "Não foi possível cancelar."); }
  }

  if (view.type === "form") return <ProductionForm production={view.production} recipes={recipes} onCancel={() => setView({ type: "list" })} onSaveDraft={saveDraft} onComplete={finish} onLoss={recordLoss} />;
  if (view.type === "detail") return <ProductionDetail production={view.production} alertDays={alertDays} onBack={() => setView({ type: "list" })} />;

  return <div className="animate-rise mx-auto max-w-[1320px]">
    {notice && <div role="status" className="fixed right-5 top-20 z-50 max-w-md rounded-xl bg-[#2c4637] px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]"><Factory size={14} />Fabricação e lotes</div><h1 className="font-serif text-4xl sm:text-5xl">Produção</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#776e65]">Prepare, confira e conclua seus lotes com baixa segura dos ingredientes e entrada automática dos potes.</p></div><button onClick={() => setView({ type: "form" })} disabled={!recipes.length} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(156,35,72,.22)] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={18} />Nova produção</button></div>
    {!recipes.length && !loading && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Crie uma receita ativa, associe-a a um produto e mantenha seus ingredientes ativos antes de iniciar uma produção.</p>}
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Produções no mês" value={String(completedThisMonth.length)} icon={Factory} /><Metric label="Potes produzidos no mês" value={String(completedThisMonth.reduce((sum, item) => sum + (item.producedQuantity ?? 0), 0))} icon={PackageCheck} /><Metric label="Custo direto no mês" value={money.format(completedThisMonth.reduce((sum, item) => sum + item.directCost, 0))} icon={ChefHat} /></div>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-6 overflow-hidden rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_12px_35px_rgba(62,43,29,.06)]">
      <div className="grid gap-3 border-b border-[#eadfce] p-4 sm:grid-cols-2 lg:grid-cols-4"><Filter label="De"><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></Filter><Filter label="Até"><input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></Filter><Filter label="Receita"><select value={recipeFilter} onChange={event => setRecipeFilter(event.target.value)}><option value="todos">Todas</option>{recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></Filter><Filter label="Status"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="todos">Todos</option><option value="RASCUNHO">Em preparo</option><option value="CONFIRMADA">Concluída</option><option value="CANCELADA">Cancelada</option></select></Filter></div>
      <div className="hidden grid-cols-[.7fr_1.2fr_1.2fr_.7fr_1fr_.75fr_110px] gap-4 border-b border-[#eadfce] bg-[#faf5eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#8b8177] md:grid"><span>Data</span><span>Receita</span><span>Produto</span><span>Produzido</span><span>Lote</span><span>Status</span><span>Ações</span></div>
      {loading ? <div className="flex justify-center gap-2 p-12 text-sm"><Loader2 className="animate-spin" size={18} />Carregando produções...</div> : <div className="divide-y divide-[#eee4d5]">{filtered.map(item => <ProductionRow key={item.id} production={item} alertDays={alertDays} onDetail={() => setView({ type: "detail", production: item })} onContinue={() => setView({ type: "form", production: item })} onCancel={() => void cancel(item)} />)}{!filtered.length && <div className="p-12 text-center text-sm text-[#81776e]">Nenhuma produção encontrada.</div>}</div>}
    </section>
  </div>;
}

function ProductionRow({ production, alertDays, onDetail, onContinue, onCancel }: { production: Production; alertDays: number; onDetail: () => void; onContinue: () => void; onCancel: () => void }) { const status = statusInfo(production.status); const batch = production.batch ? batchState(production.batch.expirationDate, production.batch.availableQuantity, alertDays) : null; return <article className="m-3 grid gap-3 rounded-xl border border-[#eadfce] p-4 md:m-0 md:grid-cols-[.7fr_1.2fr_1.2fr_.7fr_1fr_.75fr_110px] md:items-center md:rounded-none md:border-0 md:px-5"><p className="text-sm">{formatDate(production.productionDate)}</p><div><p className="font-serif font-semibold">{production.recipeName}</p><p className="text-xs text-[#81776e]">{production.multiplier} receita(s) base</p></div><p className="text-sm">{production.productName}</p><p className="text-sm font-bold">{production.producedQuantity ?? "—"} potes</p><div><p className="text-sm font-semibold">{production.batchCode ?? "Aguardando conclusão"}</p>{batch && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${batch.className}`}>{batch.label}</span>}</div><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}>{status.label}</span><div className="flex justify-end gap-1"><Action label="Visualizar" icon={Eye} onClick={onDetail} />{production.status === "RASCUNHO" && <><Action label="Continuar" icon={Edit3} onClick={onContinue} /><Action label="Cancelar" icon={XCircle} onClick={onCancel} danger /></>}</div></article>; }
function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Factory }) { return <div className="rounded-[18px] border border-[#e4d8c7] bg-[#fffdf8] p-5"><div className="flex justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#80766d]">{label}</p><Icon size={18} className="text-[#3f684e]" /></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
function Filter({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-bold text-[#756b62]">{label}<div className="mt-1 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#ded2c1] [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#ded2c1] [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5">{children}</div></label>; }
function Action({ label, icon: Icon, onClick, danger }: { label: string; icon: typeof Eye; onClick: () => void; danger?: boolean }) { return <button title={label} aria-label={label} onClick={onClick} className={`rounded-lg p-2 hover:bg-[#eee4d5] ${danger ? "text-red-700" : "text-[#756b62] hover:text-[#9c2348]"}`}><Icon size={16} /></button>; }
function statusInfo(status: ProductionStatus) { return ({ RASCUNHO: { label: "Em preparo", className: "bg-amber-50 text-amber-800" }, CONFIRMADA: { label: "Concluída", className: "bg-[#e7f1e7] text-[#34603c]" }, CANCELADA: { label: "Cancelada", className: "bg-red-50 text-red-700" } } as const)[status]; }
function formatDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR"); }
function localIsoDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
