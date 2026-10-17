"use client";

import { AlertTriangle, ChevronDown, Edit3, Leaf, PackagePlus, Search, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProductForm } from "./product-form";
import { mockProducts } from "@/services/products.mock";
import { createProduct, deleteProduct, getProductImageUrl, isDemoMode, listProducts, updateProduct, uploadProductImages } from "@/services/products";
import type { ProductValidated } from "@/schemas/product";
import type { Product } from "@/types/product";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type View = { type: "list" } | { type: "create" } | { type: "edit"; product: Product };

export function ProductManager({ initialProducts = mockProducts }: { initialProducts?: Product[] }) {
  const [products, setProducts] = useState(initialProducts.length ? initialProducts : mockProducts);
  const [view, setView] = useState<View>({ type: "list" });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [notice, setNotice] = useState<string | null>(null);
  const filtered = useMemo(() => products.filter(p => (status === "todos" || p.status === status) && `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())), [products, query, status]);
  const stockValue = products.reduce((sum, p) => sum + p.sale_price * p.stock_quantity, 0);
  const lowStock = products.filter(p => p.stock_quantity <= 5).length;

  useEffect(() => {
    if (isDemoMode()) return;
    listProducts()
      .then(setProducts)
      .catch(error => setNotice(`Não foi possível carregar os produtos: ${error.message}`));
  }, []);

  async function save(value: ProductValidated, images: File[]) {
    try {
      if (isDemoMode()) {
        if (view.type === "edit") setProducts(items => items.map(p => p.id === view.product.id ? { ...p, ...value, updated_at: new Date().toISOString() } : p));
        else setProducts(items => [{ ...value, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...items]);
      } else if (view.type === "edit") {
        let saved = await updateProduct(view.product.id, value);
        const paths = await uploadProductImages(saved.id, images);
        if (paths[0]) saved = { ...saved, main_image_path: paths[0] };
        setProducts(items => items.map(p => p.id === saved.id ? saved : p));
      } else {
        let saved = await createProduct(value);
        const paths = await uploadProductImages(saved.id, images);
        if (paths[0]) saved = { ...saved, main_image_path: paths[0] };
        setProducts(items => [saved, ...items]);
      }
      setNotice("Produto salvo com sucesso.");
      setView({ type: "list" });
    } catch (error) {
      setNotice(`Não foi possível salvar: ${error instanceof Error ? error.message : "erro inesperado"}`);
    }
    setTimeout(() => setNotice(null), 3200);
  }

  async function remove(product: Product) {
    if (!confirm(`Excluir “${product.name}”? Esta ação não pode ser desfeita.`)) return;
    try {
      if (!isDemoMode()) await deleteProduct(product.id);
      setProducts(items => items.filter(p => p.id !== product.id));
      setNotice("Produto excluído.");
    } catch (error) {
      setNotice(`Não foi possível excluir: ${error instanceof Error ? error.message : "erro inesperado"}`);
    }
    setTimeout(() => setNotice(null), 3200);
  }

  if (view.type !== "list") return <ProductForm product={view.type === "edit" ? view.product : undefined} onCancel={() => setView({ type: "list" })} onSave={save} />;

  return <div className="animate-rise mx-auto max-w-[1320px]">
    {notice && <div role="status" className="fixed right-5 top-20 z-50 rounded-xl bg-[#2c4637] px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]"><Leaf size={14} />Catálogo e estoque</div><h1 className="font-serif text-4xl leading-none sm:text-5xl">Produtos</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#776e65]">Organize os sabores, preços e disponibilidade da sua produção artesanal.</p></div><button onClick={() => setView({ type: "create" })} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(156,35,72,.22)] hover:bg-[#7e1938]"><PackagePlus size={18} />Novo produto</button></div>
    {isDemoMode() && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#ddc898] bg-[#fff7df] p-4 text-sm text-[#66552b]"><Sparkles className="mt-0.5 shrink-0" size={18} /><div><strong>Modo demonstração</strong><p className="mt-0.5 text-xs leading-5 opacity-80">As alterações ficam nesta sessão. Configure o arquivo .env.local para conectar ao Supabase.</p></div></div>}
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Produtos cadastrados" value={String(products.length).padStart(2, "0")} note={`${products.filter(p => p.status === "ativo").length} ativos no catálogo`} /><Metric label="Valor em estoque" value={money.format(stockValue)} note="Pelo preço atual de venda" /><Metric label="Atenção ao estoque" value={String(lowStock).padStart(2, "0")} note="Com 5 unidades ou menos" warn={lowStock > 0} /></div>
    <section className="mt-6 overflow-hidden rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_12px_35px_rgba(62,43,29,.06)]">
      <div className="flex flex-col gap-3 border-b border-[#eadfce] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#948a7f]" size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome ou categoria..." className="w-full rounded-xl border border-[#ded2c1] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#9c2348]" /></div><div className="relative"><select value={status} onChange={e => setStatus(e.target.value)} className="appearance-none rounded-xl border border-[#ded2c1] bg-white py-2.5 pl-4 pr-10 text-sm font-medium outline-none"><option value="todos">Todos os status</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="esgotado">Esgotados</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" size={16} /></div></div>
      <div className="hidden grid-cols-[2.1fr_.8fr_.65fr_.7fr_.7fr_72px] gap-4 border-b border-[#eadfce] bg-[#faf5eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#8b8177] md:grid"><span>Produto</span><span>Categoria</span><span>Preço</span><span>Estoque</span><span>Status</span><span /></div>
      <div className="divide-y divide-[#eee4d5]">{filtered.map((product, index) => <ProductRow key={product.id} product={product} index={index} onEdit={() => setView({ type: "edit", product })} onDelete={() => remove(product)} />)}{filtered.length === 0 && <div className="p-12 text-center text-sm text-[#81776e]">Nenhum produto encontrado com esses filtros.</div>}</div>
      <div className="flex items-center justify-between border-t border-[#eadfce] px-5 py-3 text-xs text-[#81776e]"><span>Exibindo {filtered.length} de {products.length} produtos</span><span>Página 1 de 1</span></div>
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
    <div className="flex min-w-0 items-center gap-3"><div className={`relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${colors[index % colors.length]} shadow-inner`}>{imageUrl ? <span role="img" aria-label={`Foto de ${product.name}`} style={{ backgroundImage: `url(${imageUrl})` }} className="absolute inset-0 bg-cover bg-center" /> : <div className="h-9 w-7 rounded-[5px_5px_8px_8px] border border-white/30 bg-white/20"><div className="mx-auto -mt-1 h-2 w-6 rounded-sm bg-[#d5b47d]" /></div>}</div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-serif text-lg font-semibold">{product.name}</p>{product.featured && <Sparkles size={14} className="shrink-0 text-[#b18431]" />}</div><p className="truncate text-xs text-[#8b8177]">{product.net_weight}{product.unit} · {product.slug}</p></div></div>
    <p className="text-sm text-[#645c55]"><span className="mr-2 text-xs font-bold text-[#9a9087] md:hidden">Categoria</span>{product.category}</p><p className="text-sm font-bold">{money.format(product.sale_price)}</p><p className={`text-sm font-semibold ${product.stock_quantity <= 5 ? "text-[#aa4c2d]" : "text-[#4e6655]"}`}>{product.stock_quantity} un.</p><div><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${status}`}>{product.status}</span></div><div className="flex justify-end gap-1"><button aria-label={`Editar ${product.name}`} onClick={onEdit} className="rounded-lg p-2 text-[#756b62] hover:bg-[#eee4d5] hover:text-[#9c2348]"><Edit3 size={17} /></button><button aria-label={`Excluir ${product.name}`} onClick={onDelete} className="rounded-lg p-2 text-[#756b62] hover:bg-red-50 hover:text-red-700"><Trash2 size={17} /></button></div>
  </div>;
}
