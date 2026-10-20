"use client";

import Link from "next/link";
import { Banknote, CalendarCheck, Eye, Loader2, PackageCheck, Plus, Search, WalletCards, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SaleDetail, statusLabel } from "./sale-detail";
import { cancelSale, confirmSaleRefund, listSales, registerSalePayment } from "@/services/sales";
import type { PaymentMethod, Sale } from "@/types/sale";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function SalesManager({ completed = false }: { completed?: boolean }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(completed ? "Venda registrada com sucesso!" : null);
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const [customer, setCustomer] = useState("todos"); const [status, setStatus] = useState("todos");
  const [method, setMethod] = useState("todos"); const [query, setQuery] = useState("");

  async function load() {
    setLoading(true); setError(null);
    try { setSales(await listSales()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as vendas."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => sales.filter(sale =>
    (!start || localIsoDate(sale.date) >= start) && (!end || localIsoDate(sale.date) <= end)
    && (customer === "todos" || sale.customerId === customer) && (status === "todos" || sale.status === status)
    && (method === "todos" || sale.paymentMethod === method)
    && `${sale.number} ${sale.customerName ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  ), [sales, start, end, customer, status, method, query]);

  const today = localIsoDate();
  const todaySales = sales.filter(sale => localIsoDate(sale.date) === today && sale.status !== "CANCELADA");
  const receivedToday = sales.reduce((sum, sale) => sum
    + (sale.payment && localIsoDate(sale.payment.receivedAt) === today ? sale.payment.value : 0)
    - (sale.refund?.status === "REALIZADO" && sale.refund.realizedAt && localIsoDate(sale.refund.realizedAt) === today ? sale.refund.value : 0), 0);
  const filteredValid = filtered.filter(sale => sale.status !== "CANCELADA");
  const sold = filteredValid.reduce((sum, sale) => sum + sale.total, 0);
  const received = filtered.reduce((sum, sale) => sum + (sale.payment?.value ?? 0) - (sale.refund?.status === "REALIZADO" ? sale.refund.value : 0), 0);
  const pending = filtered.filter(sale => sale.status === "PENDENTE").reduce((sum, sale) => sum + sale.total, 0);
  const pendingCount = filtered.filter(sale => sale.status === "PENDENTE").length;

  function showNotice(message: string) { setNotice(message); setTimeout(() => setNotice(null), 5000); }
  async function receive(sale: Sale) {
    const answer = window.prompt("Forma de pagamento: PIX, DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO ou TRANSFERENCIA", sale.paymentMethod);
    if (!answer) return;
    const normalized = answer.toUpperCase().replaceAll(" ", "_") as PaymentMethod;
    if (!( ["PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "TRANSFERENCIA"] as string[]).includes(normalized)) { setError("Forma de pagamento inválida."); return; }
    try { await registerSalePayment(sale.id, normalized); await load(); showNotice("Pagamento registrado com sucesso."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível registrar o pagamento."); }
  }
  async function cancel(sale: Sale) {
    const reason = window.prompt("Informe o motivo obrigatório do cancelamento:");
    if (!reason?.trim()) return;
    const returnStock = window.confirm("Os produtos NÃO saíram da empresa, estão dentro da validade e aptos para voltar ao estoque comercializável?");
    const refundDone = sale.status === "PAGA" ? window.confirm("O dinheiro já foi devolvido ao cliente? Clique em Cancelar para deixar o estorno financeiro pendente.") : false;
    try { await cancelSale(sale.id, reason, returnStock, refundDone); await load(); showNotice(returnStock ? "Venda cancelada e produtos devolvidos aos lotes originais." : "Venda cancelada sem retorno automático ao estoque."); }
    catch (reasonError) { setError(reasonError instanceof Error ? reasonError.message : "Não foi possível cancelar."); }
  }
  async function confirmRefund(sale: Sale) {
    if (!window.confirm(`Confirmar que o estorno de ${money.format(sale.refund?.value ?? 0)} foi devolvido ao cliente?`)) return;
    try { await confirmSaleRefund(sale.id); await load(); showNotice("Estorno financeiro confirmado."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível confirmar o estorno."); }
  }

  if (selected) return <SaleDetail sale={selected} onBack={() => setSelected(null)} />;
  const customers = Array.from(new Map(sales.filter(sale => sale.customerId).map(sale => [sale.customerId!, sale.customerName ?? "Cliente"])).entries());

  return <div className="animate-rise mx-auto max-w-[1320px]">
    {notice && <div className="fixed right-5 top-20 z-50 rounded-xl bg-[#2c4637] px-4 py-3 text-sm font-bold text-white">{notice}</div>}
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Pedidos e recebimentos</p><h1 className="mt-1 font-serif text-5xl">Vendas</h1><p className="mt-3 text-sm text-[#776e65]">Registre vendas, acompanhe pagamentos e consulte a rastreabilidade dos lotes.</p></div><Link href="/vendas/nova" className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3 text-sm font-bold text-white"><Plus size={18} />Nova venda</Link></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Metric label="Vendas hoje" value={String(todaySales.length)} icon={CalendarCheck} /><Metric label="Produtos hoje" value={String(todaySales.flatMap(sale => sale.items).reduce((sum, item) => sum + item.quantity, 0))} icon={PackageCheck} /><Metric label="Recebido hoje" value={money.format(receivedToday)} icon={Banknote} /><Metric label="Total no filtro" value={money.format(sold)} icon={WalletCards} /><Metric label="Recebido no filtro" value={money.format(received)} icon={Banknote} /><Metric label={`A receber (${pendingCount})`} value={money.format(pending)} icon={WalletCards} /></div>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-6 overflow-hidden rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8]">
      <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-6"><Filter><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Número ou cliente" /></Filter><Input type="date" value={start} onChange={setStart} /><Input type="date" value={end} onChange={setEnd} /><Select value={customer} onChange={setCustomer}><option value="todos">Todos os clientes</option>{customers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select><Select value={status} onChange={setStatus}><option value="todos">Todos os status</option><option value="PAGA">Pago</option><option value="PENDENTE">Pendente</option><option value="CANCELADA">Cancelado</option></Select><Select value={method} onChange={setMethod}><option value="todos">Todas as formas</option><option value="PIX">PIX</option><option value="DINHEIRO">Dinheiro</option><option value="CARTAO_CREDITO">Crédito</option><option value="CARTAO_DEBITO">Débito</option><option value="TRANSFERENCIA">Transferência</option></Select></div>
      <div className="hidden grid-cols-[1fr_.8fr_1fr_.55fr_.8fr_.65fr_110px] gap-3 border-b bg-[#faf5eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#81776e] md:grid"><span>Venda</span><span>Data</span><span>Cliente</span><span>Itens</span><span>Total</span><span>Status</span><span>Ações</span></div>
      {loading ? <div className="flex justify-center gap-2 p-12"><Loader2 className="animate-spin" />Carregando...</div> : <div className="divide-y">{filtered.map(sale => <article key={sale.id} className="m-3 grid gap-3 rounded-xl border p-4 md:m-0 md:grid-cols-[1fr_.8fr_1fr_.55fr_.8fr_.65fr_110px] md:items-center md:border-0 md:px-5"><strong>{sale.number}</strong><span className="text-sm">{new Date(sale.date).toLocaleDateString("pt-BR")}</span><span className="text-sm">{sale.customerName ?? "Venda avulsa"}</span><span className="text-sm">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</span><span className="font-bold">{money.format(sale.total)}</span><span className={`w-fit rounded-full px-2 py-1 text-xs font-bold ${sale.status === "PAGA" ? "bg-green-50 text-green-700" : sale.status === "PENDENTE" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>{statusLabel(sale.status)}</span><div className="flex justify-end gap-1"><Action title="Detalhes" icon={Eye} onClick={() => setSelected(sale)} />{sale.status === "PENDENTE" && <Action title="Registrar pagamento" icon={Banknote} onClick={() => void receive(sale)} />}{sale.status === "CANCELADA" && sale.refund?.status === "PENDENTE" && <Action title="Confirmar estorno financeiro" icon={Banknote} onClick={() => void confirmRefund(sale)} />}{sale.status !== "CANCELADA" && <Action title="Cancelar" icon={XCircle} danger onClick={() => void cancel(sale)} />}</div></article>)}{!filtered.length && <p className="p-12 text-center text-sm">Nenhuma venda encontrada.</p>}</div>}
    </section>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CalendarCheck }) { return <div className="rounded-[18px] border border-[#e4d8c7] bg-[#fffdf8] p-5"><div className="flex justify-between"><p className="text-xs font-bold uppercase tracking-[.1em] text-[#81776e]">{label}</p><Icon size={18} className="text-[#315c3e]" /></div><p className="mt-3 font-serif text-2xl">{value}</p></div>; }
function Filter({ children }: { children: React.ReactNode }) { return <div className="flex items-center gap-2 rounded-xl border bg-white px-3 [&_input]:w-full [&_input]:py-2.5 [&_input]:outline-none">{children}</div>; }
function Input({ type, value, onChange }: { type: string; value: string; onChange: (value: string) => void }) { return <input type={type} value={value} onChange={event => onChange(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm" />; }
function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select value={value} onChange={event => onChange(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm">{children}</select>; }
function Action({ title, icon: Icon, onClick, danger }: { title: string; icon: typeof Eye; onClick: () => void; danger?: boolean }) { return <button title={title} onClick={onClick} className={`rounded-lg p-2 hover:bg-[#eee4d5] ${danger ? "text-red-700" : "text-[#6f665d]"}`}><Icon size={16} /></button>; }
function localIsoDate(value?: string) { const date = value ? new Date(value) : new Date(); return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); }
