import { AlertTriangle, ArrowUpRight, Factory, Package, PackageCheck, ShoppingBag, WalletCards } from "lucide-react";
import Link from "next/link";
import { getDashboardData } from "@/services/dashboard";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function DashboardPage() {
  const data = await getDashboardData();
  const cards = [
    { label: "Faturamento do mês", value: money.format(data.revenue), icon: WalletCards, note: "Vendas não canceladas" },
    { label: "Número de vendas", value: String(data.salesCount), icon: ShoppingBag, note: "No mês atual" },
    { label: "Produtos vendidos", value: String(data.productsSold), icon: PackageCheck, note: "Unidades no mês" },
    { label: "Produções realizadas", value: String(data.productionsCount), icon: Factory, note: "Lotes no mês" },
    { label: "Estoque baixo", value: String(data.lowStockCount), icon: AlertTriangle, note: "Produtos e ingredientes", warn: data.lowStockCount > 0 },
  ];

  return <div className="animate-rise mx-auto max-w-[1320px]">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Visão geral</p><h1 className="mt-1 font-serif text-4xl sm:text-5xl">Dashboard</h1><p className="mt-3 text-sm text-[#776e65]">Acompanhe os principais números da operação.</p></div><p className="text-xs text-[#8b8177]">Atualizado agora</p></div>
    <section aria-label="Indicadores do mês" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ label, value, icon: Icon, note, warn }) => <article key={label} className="rounded-[18px] border border-[#e4d8c7] bg-[#fffdf8] p-5 shadow-[0_8px_25px_rgba(62,43,29,.04)]"><div className="flex items-start justify-between"><p className="text-xs font-bold uppercase leading-5 tracking-[.1em] text-[#80766d]">{label}</p><Icon size={19} className={warn ? "text-[#b05b2b]" : "text-[#3f684e]"} /></div><p className="mt-4 font-serif text-3xl">{value}</p><p className="mt-1 text-xs text-[#948a80]">{note}</p></article>)}</section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <Panel title="Últimas vendas" href="/vendas"><div className="divide-y divide-[#eee4d5]">{data.latestSales.map((sale) => <div key={sale.id} className="flex items-center gap-4 py-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#9c2348]/10 text-[#9c2348]"><ShoppingBag size={18} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{sale.customer}</p><p className="mt-1 text-xs text-[#8b8177]">{date.format(new Date(sale.date))}</p></div><div className="text-right"><p className="text-sm font-bold">{money.format(sale.total)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#55765c]">{sale.status}</p></div></div>)}{data.latestSales.length === 0 && <Empty label="Nenhuma venda registrada." />}</div></Panel>
      <div className="grid gap-6">
        <Panel title="Produtos com estoque baixo" href="/produtos"><StockRows rows={data.lowStockProducts.map((item) => ({ id: item.id, name: item.name, value: `${item.quantity} un.` }))} /></Panel>
        <Panel title="Ingredientes com estoque baixo" href="/ingredientes"><StockRows rows={data.lowStockIngredients.map((item) => ({ id: item.id, name: item.name, value: `${item.quantity} ${item.unit} · mín. ${item.minimum}` }))} /></Panel>
      </div>
    </div>
  </div>;
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return <section className="rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] p-5 shadow-[0_12px_35px_rgba(62,43,29,.05)]"><div className="mb-2 flex items-center justify-between"><h2 className="font-serif text-xl">{title}</h2><Link href={href} className="flex items-center gap-1 text-xs font-bold text-[#9c2348] hover:underline">Ver módulo <ArrowUpRight size={14} /></Link></div>{children}</section>;
}

function StockRows({ rows }: { rows: Array<{ id: string; name: string; value: string }> }) {
  if (rows.length === 0) return <Empty label="Nenhum item exige atenção." />;
  return <div className="divide-y divide-[#eee4d5]">{rows.map((row) => <div key={row.id} className="flex items-center gap-3 py-3.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff2e8] text-[#b05b2b]"><Package size={17} /></div><p className="min-w-0 flex-1 truncate text-sm font-semibold">{row.name}</p><span className="text-xs font-bold text-[#a34e2e]">{row.value}</span></div>)}</div>;
}

function Empty({ label }: { label: string }) {
  return <div className="py-9 text-center text-sm text-[#8b8177]">{label}</div>;
}
