"use client";

import { AlertTriangle, ChevronDown, Edit3, Leaf, Loader2, PackagePlus, Power, Search, ShieldAlert, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductForm } from "./product-form";
import { mockProducts } from "@/services/products.mock";
import { archiveProduct, createProduct, deleteProduct, getProductDeletionStatus, getProductImageUrl, isDemoMode, listProducts, updateProduct, uploadProductImages } from "@/services/products";
import type { ProductValidated } from "@/schemas/product";
import type { Product, ProductDeletionStatus } from "@/types/product";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type View = { type: "list" } | { type: "create" } | { type: "edit"; product: Product };

export function ProductManager({ initialProducts = mockProducts }: { initialProducts?: Product[] }) {
  const [products, setProducts] = useState(initialProducts.length ? initialProducts : mockProducts);
  const [view, setView] = useState<View>({ type: "list" });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("operacionais");
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deletionStatus, setDeletionStatus] = useState<ProductDeletionStatus | null>(null);
  const [deletionError, setDeletionError] = useState<string | null>(null);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const operationalProducts = useMemo(() => products.filter(product => product.status !== "inativo"), [products]);
  const filtered = useMemo(() => products.filter(p => (status === "todos" || (status === "operacionais" ? p.status !== "inativo" : p.status === status)) && `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())), [products, query, status]);
  const stockValue = operationalProducts.reduce((sum, p) => sum + p.sale_price * p.stock_quantity, 0);
  const lowStock = operationalProducts.filter(p => p.stock_quantity <= 5).length;

  useEffect(() => {
    if (isDemoMode()) return;
    listProducts()
      .then(setProducts)
      .catch(error => setNotice(`Não foi possível carregar os produtos: ${error.message}`));
  }, []);

  async function save(value: ProductValidated, images: File[]) {
    setFormError(null);
    try {
      let successMessage = "Produto salvo com sucesso.";
      if (isDemoMode()) {
        if (view.type === "edit") setProducts(items => items.map(p => p.id === view.product.id ? { ...p, ...value, updated_at: new Date().toISOString() } : p));
        else setProducts(items => [{ ...value, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...items]);
      } else if (view.type === "edit") {
        let saved = await updateProduct(view.product.id, value);
        if (images.length) {
          try {
            const paths = await uploadProductImages(saved.id, images);
            if (paths[0]) saved = { ...saved, main_image_path: paths[0] };
          } catch (error) {
            successMessage = `Produto atualizado, mas não foi possível enviar as imagens: ${error instanceof Error ? error.message : "erro inesperado"}`;
          }
        }
        setProducts(items => items.map(p => p.id === saved.id ? saved : p));
      } else {
        let saved = await createProduct(value);
        if (images.length) {
          try {
            const paths = await uploadProductImages(saved.id, images);
            if (paths[0]) saved = { ...saved, main_image_path: paths[0] };
          } catch (error) {
            successMessage = `Produto criado, mas não foi possível enviar as imagens: ${error instanceof Error ? error.message : "erro inesperado"}`;
          }
        }
        setProducts(items => [saved, ...items]);
      }
      setNotice(successMessage);
      setView({ type: "list" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Ocorreu um erro inesperado.");
      return;
    }
    setTimeout(() => setNotice(null), 3200);
  }

  async function inspectDeletion(product: Product) {
    setDeleteTarget(product);
    setDeletionStatus(null);
    setDeletionError(null);
    setDeletionBusy(false);
    if (isDemoMode()) {
      setDeletionStatus({ canDelete: true, references: { recipes: 0, productions: 0, saleItems: 0, stockMovements: 0 } });
      return;
    }

    try {
      setDeletionStatus(await getProductDeletionStatus(product.id));
    } catch (error) {
      setDeletionError(error instanceof Error ? error.message : "Não foi possível verificar o produto.");
    }
  }

  function closeDeletion() {
    if (deletionBusy) return;
    setDeleteTarget(null);
    setDeletionStatus(null);
    setDeletionError(null);
  }

  async function removePermanently() {
    if (!deleteTarget) return;
    setDeletionBusy(true);
    setDeletionError(null);
    try {
      const result = isDemoMode() ? {} : await deleteProduct(deleteTarget.id);
      setProducts(items => items.filter(product => product.id !== deleteTarget.id));
      setNotice(result.warning ?? "Produto excluído definitivamente.");
      setDeleteTarget(null);
      setDeletionStatus(null);
    } catch (error) {
      setDeletionError(error instanceof Error ? error.message : "Não foi possível excluir o produto.");
    } finally {
      setDeletionBusy(false);
    }
    setTimeout(() => setNotice(null), 3200);
  }

  async function archive() {
    if (!deleteTarget) return;
    setDeletionBusy(true);
    setDeletionError(null);
    try {
      const updated = isDemoMode() ? { ...deleteTarget, status: "inativo" as const, published: false, featured: false, updated_at: new Date().toISOString() } : await archiveProduct(deleteTarget.id);
      setProducts(items => items.map(product => product.id === updated.id ? updated : product));
      setNotice("Produto arquivado. Vendas, produções e relatórios foram preservados.");
      setDeleteTarget(null);
      setDeletionStatus(null);
    } catch (error) {
      setDeletionError(error instanceof Error ? error.message : "Não foi possível arquivar o produto.");
    } finally {
      setDeletionBusy(false);
    }
    setTimeout(() => setNotice(null), 3200);
  }

  if (view.type !== "list") return <ProductForm product={view.type === "edit" ? view.product : undefined} submitError={formError} onCancel={() => { setFormError(null); setView({ type: "list" }); }} onSave={save} />;

  return <div className="animate-rise mx-auto max-w-[1320px]">
    {notice && <div role="status" className="fixed right-5 top-20 z-50 rounded-xl bg-[#2c4637] px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    {deleteTarget && <DeletionDialog product={deleteTarget} status={deletionStatus} error={deletionError} busy={deletionBusy} onClose={closeDeletion} onDelete={removePermanently} onArchive={archive} />}
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]"><Leaf size={14} />Catálogo e estoque</div><h1 className="font-serif text-4xl leading-none sm:text-5xl">Produtos</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#776e65]">Organize os sabores, preços e disponibilidade da sua produção artesanal.</p></div><button onClick={() => { setFormError(null); setView({ type: "create" }); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(156,35,72,.22)] hover:bg-[#7e1938]"><PackagePlus size={18} />Novo produto</button></div>
    {isDemoMode() && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#ddc898] bg-[#fff7df] p-4 text-sm text-[#66552b]"><Sparkles className="mt-0.5 shrink-0" size={18} /><div><strong>Modo demonstração</strong><p className="mt-0.5 text-xs leading-5 opacity-80">As alterações ficam nesta sessão. Configure o arquivo .env.local para conectar ao Supabase.</p></div></div>}
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Produtos em uso" value={String(operationalProducts.length).padStart(2, "0")} note={`${products.filter(p => p.published && p.status === "ativo").length} publicados no catálogo`} /><Metric label="Valor em estoque" value={money.format(stockValue)} note="Desconsidera produtos arquivados" /><Metric label="Atenção ao estoque" value={String(lowStock).padStart(2, "0")} note="Produtos em uso com 5 unidades ou menos" warn={lowStock > 0} /></div>
    <section className="mt-6 overflow-hidden rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_12px_35px_rgba(62,43,29,.06)]">
      <div className="flex flex-col gap-3 border-b border-[#eadfce] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#948a7f]" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome ou categoria..." className="w-full rounded-xl border border-[#ded2c1] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#9c2348]" /></div><div className="relative"><select value={status} onChange={e => setStatus(e.target.value)} className="appearance-none rounded-xl border border-[#ded2c1] bg-white py-2.5 pl-4 pr-10 text-sm font-medium outline-none"><option value="operacionais">Produtos em uso</option><option value="ativo">Ativos</option><option value="esgotado">Esgotados</option><option value="inativo">Arquivados</option><option value="todos">Todos os status</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16} /></div></div>
      <div className="hidden grid-cols-[2.1fr_.8fr_.65fr_.7fr_.7fr_72px] gap-4 border-b border-[#eadfce] bg-[#faf5eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#8b8177] md:grid"><span>Produto</span><span>Categoria</span><span>Preço</span><span>Estoque</span><span>Status</span><span /></div>
      <div className="divide-y divide-[#eee4d5]">{filtered.map((product, index) => <ProductRow key={product.id} product={product} index={index} onEdit={() => setView({ type: "edit", product })} onDelete={() => inspectDeletion(product)} />)}{filtered.length === 0 && <div className="p-12 text-center text-sm text-[#81776e]">Nenhum produto encontrado com esses filtros.</div>}</div>
      <div className="flex items-center justify-between border-t border-[#eadfce] px-5 py-3 text-xs text-[#81776e]"><span>Exibindo {filtered.length} de {products.length} produtos</span><span>Página 1 de 1</span></div>
    </section>
  </div>;
}

function DeletionDialog({ product, status, error, busy, onClose, onDelete, onArchive }: { product: Product; status: ProductDeletionStatus | null; error: string | null; busy: boolean; onClose: () => void; onDelete: () => void; onArchive: () => void }) {
  const references = status ? [
    ["Receitas", status.references.recipes],
    ["Produções", status.references.productions],
    ["Itens de venda", status.references.saleItems],
    ["Movimentações de estoque", status.references.stockMovements],
  ].filter(([, count]) => Number(count) > 0) : [];

  return <div className="fixed inset-0 z-50 grid place-items-center p-4">
    <button type="button" aria-label="Fechar diálogo" className="absolute inset-0 bg-[#211912]/55 backdrop-blur-sm" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-labelledby="deletion-title" className="relative w-full max-w-lg rounded-[22px] border border-[#e4d8c7] bg-[#fffdf8] p-6 shadow-2xl sm:p-7">
      <button type="button" aria-label="Fechar" disabled={busy} onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-[#81776e] hover:bg-[#f1e8dc] disabled:opacity-40"><X size={18} /></button>
      <div className="flex items-start gap-4 pr-9"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff0e8] text-[#a94d2d]"><ShieldAlert size={22} /></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#9c2348]">Exclusão segura</p><h2 id="deletion-title" className="mt-1 font-serif text-2xl">{product.name}</h2></div></div>

      {!status && !error && <div className="mt-7 flex items-center gap-3 rounded-xl bg-[#f7f1e5] p-4 text-sm text-[#6f665d]"><Loader2 className="animate-spin" size={18} />Verificando vínculos do produto...</div>}
      {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}

      {status?.canDelete && <div className="mt-6"><p className="text-sm leading-6 text-[#665e57]">Este produto não possui receitas, produções, vendas ou movimentações vinculadas. Você pode arquivá-lo com segurança ou excluí-lo permanentemente.</p><p className="mt-3 rounded-xl bg-[#eef5ee] p-3 text-xs leading-5 text-[#34603c]"><strong>Arquivar</strong> retira o produto da operação e do catálogo, mas mantém seu cadastro e não altera relatórios.</p><p className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700">A exclusão definitiva remove também os registros de imagens e não poderá ser desfeita.</p></div>}

      {status && !status.canDelete && <div className="mt-6"><p className="text-sm leading-6 text-[#665e57]">A exclusão definitiva foi bloqueada porque este produto possui histórico relacionado:</p><ul className="mt-4 space-y-2">{references.map(([label, count]) => <li key={String(label)} className="flex items-center justify-between rounded-xl bg-[#f7f1e5] px-4 py-2.5 text-sm"><span>{label}</span><strong>{count}</strong></li>)}</ul><p className="mt-4 text-sm leading-6 text-[#665e57]">{product.status === "inativo" ? "O produto já está arquivado e seu histórico permanece preservado." : "Arquive o produto para retirá-lo da operação e do catálogo sem alterar vendas, produções ou relatórios anteriores."}</p></div>}

      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#eadfce] pt-5 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-[#d8cbb9] px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Cancelar</button>{status && product.status !== "inativo" && <button type="button" disabled={busy} onClick={onArchive} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#7e1938] disabled:opacity-60">{busy ? <Loader2 className="animate-spin" size={17} /> : <Power size={17} />}Arquivar sem afetar relatórios</button>}{status?.canDelete && <button type="button" disabled={busy} onClick={onDelete} className="flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60">{busy ? <Loader2 className="animate-spin" size={17} /> : <Trash2 size={17} />}Excluir definitivamente</button>}</div>
    </section>
  </div>;
}

function Metric({ label, value, note, warn }: { label: string; value: string; note: string; warn?: boolean }) {
  return <div className="rounded-[18px] border border-[#e4d8c7] bg-[#fffdf8] p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#80766d]">{label}</p>{warn && <AlertTriangle size={17} className="text-[#b05b2b]" />}</div><p className="mt-3 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#948a80]">{note}</p></div>;
}

function ProductRow({ product, index, onEdit, onDelete }: { product: Product; index: number; onEdit: () => void; onDelete: () => void }) {
  const colors = ["from-[#aa294e] to-[#6e1733]", "from-[#6e274a] to-[#3b1831]", "from-[#c35e31] to-[#852a26]"];
  const status = product.status === "ativo" ? "bg-[#e7f1e7] text-[#34603c]" : product.status === "esgotado" ? "bg-[#f8e5e0] text-[#9a3f2f]" : "bg-[#eeeae4] text-[#675f57]";
  const imageUrl = getProductImageUrl(product.main_image_path);
  return <div className="grid gap-3 p-4 transition hover:bg-[#fdf9f1] md:grid-cols-[2.1fr_.8fr_.65fr_.7fr_.7fr_72px] md:items-center md:gap-4 md:px-5">
    <div className="flex min-w-0 items-center gap-3"><div className={`relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${colors[index % colors.length]} shadow-inner`}>{imageUrl ? <span role="img" aria-label={`Foto de ${product.name}`} style={{ backgroundImage: `url(${imageUrl})` }} className="absolute inset-0 bg-cover bg-center" /> : <div className="h-9 w-7 rounded-[5px_5px_8px_8px] border border-white/30 bg-white/20"><div className="mx-auto -mt-1 h-2 w-6 rounded-sm bg-[#d5b47d]" /></div>}</div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-serif text-lg font-semibold">{product.name}</p>{product.featured && <Sparkles size={14} className="shrink-0 text-[#b18431]" />}{product.published && <span className="rounded-full bg-[#e7f1e7] px-2 py-0.5 text-[9px] font-bold uppercase text-[#34603c]">Publicado</span>}</div><p className="truncate text-xs text-[#8b8177]">{product.net_weight}{product.unit} · {product.slug}</p></div></div>
    <p className="text-sm text-[#645c55]"><span className="mr-2 text-xs font-bold text-[#9a9087] md:hidden">Categoria</span>{product.category}</p><p className="text-sm font-bold">{money.format(product.sale_price)}</p><p className={`text-sm font-semibold ${product.stock_quantity <= 5 ? "text-[#aa4c2d]" : "text-[#4e6655]"}`}>{product.stock_quantity} un.</p><div><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${status}`}>{product.status}</span></div><div className="flex justify-end gap-1"><button aria-label={`Editar ${product.name}`} onClick={onEdit} className="rounded-lg p-2 text-[#756b62] hover:bg-[#eee4d5] hover:text-[#9c2348]"><Edit3 size={17} /></button><button aria-label={`Excluir ${product.name}`} onClick={onDelete} className="rounded-lg p-2 text-[#756b62] hover:bg-red-50 hover:text-red-700"><Trash2 size={17} /></button></div>
  </div>;
}
