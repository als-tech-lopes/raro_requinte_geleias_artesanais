"use client";

import { BookOpen, ChefHat, Copy, Edit3, Eye, Loader2, Plus, Power, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RecipeForm } from "./recipe-form";
import { recipeCosts } from "./recipe-calculations";
import { RecipeSheet } from "./recipe-sheet";
import type { RecipeValidated } from "@/schemas/recipe";
import { inactivateRecipe, listRecipeCatalog, listRecipes, saveRecipe } from "@/services/recipes";
import type { Recipe, RecipeCatalogIngredient, RecipeProduct } from "@/types/recipe";

type View = { type: "list" } | { type: "form"; recipe?: Recipe; duplicate?: boolean } | { type: "detail"; recipe: Recipe };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function RecipeManager() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<RecipeCatalogIngredient[]>([]);
  const [products, setProducts] = useState<RecipeProduct[]>([]);
  const [view, setView] = useState<View>({ type: "list" });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const [recipeData, catalog] = await Promise.all([listRecipes(), listRecipeCatalog()]); setRecipes(recipeData); setIngredients(catalog.ingredients); setProducts(catalog.products); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as receitas."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => recipes.filter(recipe => `${recipe.name} ${recipe.productName ?? ""}`.toLowerCase().includes(query.toLowerCase())), [recipes, query]);
  function showNotice(message: string) { setNotice(message); setTimeout(() => setNotice(null), 4500); }
  async function save(id: string | null, input: RecipeValidated) {
    const savedId = await saveRecipe(id, input);
    await load(); setView({ type: "list" });
    showNotice(id && savedId !== id ? "Nova versão criada. A versão usada em produção foi preservada." : "Receita salva com sucesso.");
  }
  async function inactivate(recipe: Recipe) {
    if (!window.confirm(`Inativar a receita "${recipe.name}"?`)) return;
    try { await inactivateRecipe(recipe.id); await load(); showNotice("Receita inativada. O histórico foi preservado."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível inativar a receita."); }
  }

  if (view.type === "form") return <RecipeForm recipe={view.recipe} duplicate={view.duplicate} ingredients={ingredients} products={products} onCancel={() => setView({ type: "list" })} onSave={save} />;
  if (view.type === "detail") return <RecipeSheet recipe={view.recipe} onBack={() => setView({ type: "list" })} />;

  return <div className="animate-rise mx-auto max-w-[1320px]">
    {notice && <div role="status" className="fixed right-5 top-20 z-50 max-w-sm rounded-xl bg-[#2c4637] px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]"><BookOpen size={14} />Fórmulas e custos</div><h1 className="font-serif text-4xl sm:text-5xl">Receitas</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#776e65]">Organize suas fórmulas, acompanhe o rendimento e consulte o custo atualizado dos ingredientes.</p></div><button onClick={() => setView({ type: "form" })} disabled={!ingredients.length} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(156,35,72,.22)] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={18} />Nova receita</button></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2"><Metric label="Receitas cadastradas" value={recipes.length} icon={BookOpen} /><Metric label="Receitas ativas" value={recipes.filter(item => item.active).length} icon={ChefHat} /></div>
    {!ingredients.length && !loading && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Cadastre pelo menos um ingrediente ativo antes de criar uma receita.</div>}
    {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="mt-6 overflow-hidden rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_12px_35px_rgba(62,43,29,.06)]">
      <div className="border-b border-[#eadfce] p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#948a7f]" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar receita ou produto..." className="w-full rounded-xl border border-[#ded2c1] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#9c2348]" /></div></div>
      <div className="hidden grid-cols-[1.25fr_1fr_.65fr_.8fr_.8fr_120px] gap-4 border-b border-[#eadfce] bg-[#faf5eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#8b8177] md:grid"><span>Receita</span><span>Produto</span><span>Rendimento</span><span>Custo por lote</span><span>Custo por pote</span><span>Ações</span></div>
      {loading ? <div className="flex justify-center gap-2 p-12 text-sm"><Loader2 className="animate-spin" size={18} />Carregando receitas...</div> : <div className="divide-y divide-[#eee4d5]">{filtered.map(recipe => <RecipeRow key={recipe.id} recipe={recipe} onView={() => setView({ type: "detail", recipe })} onEdit={() => setView({ type: "form", recipe })} onDuplicate={() => setView({ type: "form", recipe, duplicate: true })} onInactivate={() => void inactivate(recipe)} />)}{!filtered.length && <div className="p-12 text-center text-sm text-[#81776e]">Nenhuma receita encontrada.</div>}</div>}
    </section>
  </div>;
}

function RecipeRow({ recipe, onView, onEdit, onDuplicate, onInactivate }: { recipe: Recipe; onView: () => void; onEdit: () => void; onDuplicate: () => void; onInactivate: () => void }) {
  const costs = recipeCosts(recipe);
  return <article className="m-3 grid gap-3 rounded-xl border border-[#eadfce] p-4 md:m-0 md:grid-cols-[1.25fr_1fr_.65fr_.8fr_.8fr_120px] md:items-center md:rounded-none md:border-0 md:px-5"><div><p className="font-serif text-lg font-semibold">{recipe.name}</p><p className="text-xs text-[#81776e]">Versão {recipe.version} · <span className={recipe.active ? "text-[#3f684e]" : "text-[#8b8177]"}>{recipe.active ? "Ativa" : "Inativa"}</span></p></div><p className="text-sm text-[#645c55]">{recipe.productName ?? "Sem produto associado"}</p><p className="text-sm font-semibold">{recipe.expectedJars} potes</p><p className="text-sm font-semibold">{money.format(costs.total)}</p><p className="text-sm font-semibold">{recipe.expectedJars ? money.format(costs.perJar) : "—"}</p><div className="flex justify-end gap-1"><IconButton label="Ficha técnica" icon={Eye} onClick={onView} /><IconButton label="Editar" icon={Edit3} onClick={onEdit} /><IconButton label="Duplicar" icon={Copy} onClick={onDuplicate} />{recipe.active && <IconButton label="Inativar" icon={Power} onClick={onInactivate} />}</div></article>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof BookOpen }) { return <div className="rounded-[18px] border border-[#e4d8c7] bg-[#fffdf8] p-5"><div className="flex justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#80766d]">{label}</p><Icon size={18} className="text-[#3f684e]" /></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
function IconButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Eye; onClick: () => void }) { return <button type="button" title={label} aria-label={label} onClick={onClick} className="rounded-lg p-2 text-[#756b62] hover:bg-[#eee4d5] hover:text-[#9c2348]"><Icon size={16} /></button>; }
