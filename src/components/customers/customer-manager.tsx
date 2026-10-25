"use client";

import { CalendarDays, Edit3, Loader2, Plus, Search, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerForm } from "./customer-form";
import type { CustomerValidated } from "@/schemas/customer";
import { createCustomer, listCustomers, updateCustomer } from "@/services/customers";
import type { Customer, CustomerSource } from "@/types/customer";

type View = { type: "list" } | { type: "create" } | { type: "edit"; customer: Customer };

export function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ type: "list" });
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { setCustomers(await listCustomers()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar os clientes."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    // Sincroniza a listagem protegida com o Supabase ao abrir o módulo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = normalize(query);
    return customers.filter(customer => [customer.name, customer.phone, customer.socialNetwork ?? "", sourceLabel(customer.source)].some(value => normalize(value).includes(term)));
  }, [customers, query]);

  async function save(value: CustomerValidated) {
    setError(null);
    try {
      if (view.type === "edit") await updateCustomer(view.customer.id, value);
      else await createCustomer(value);
      const message = view.type === "edit" ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.";
      await load(); setView({ type: "list" }); setNotice(message); setTimeout(() => setNotice(null), 4500);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar o cliente."); }
  }

  if (view.type !== "list") return <CustomerForm customer={view.type === "edit" ? view.customer : undefined} submitError={error} onCancel={() => { setError(null); setView({ type: "list" }); }} onSave={save} />;

  return <div className="animate-rise mx-auto max-w-[1320px]">
    {notice && <div role="status" className="fixed right-5 top-20 z-[60] max-w-sm rounded-xl bg-[#2c4637] px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]"><Users size={14} />Relacionamento</div><h1 className="font-serif text-4xl sm:text-5xl">Clientes</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#776e65]">Organize contatos e descubra quais canais mais aproximam clientes da RR Geleias.</p></div><button type="button" onClick={() => { setError(null); setView({ type: "create" }); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(156,35,72,.22)] hover:bg-[#7e1938]"><Plus size={18} />Novo cliente</button></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2"><Metric label="Clientes cadastrados" value={customers.length} icon={Users} /><Metric label="Novos neste mês" value={customers.filter(createdThisMonth).length} icon={CalendarDays} /></div>
    {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="mt-6 overflow-hidden rounded-[20px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_12px_35px_rgba(62,43,29,.06)]">
      <div className="border-b border-[#eadfce] p-4"><div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#948a7f]" size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nome, telefone, rede social ou origem..." className="w-full rounded-xl border border-[#ded2c1] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#9c2348]" /></div></div>
      <div className="hidden grid-cols-[1.2fr_.9fr_.9fr_.8fr_64px] gap-4 border-b border-[#eadfce] bg-[#faf5eb] px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#8b8177] md:grid"><span>Cliente</span><span>Telefone</span><span>Rede social</span><span>Origem</span><span /></div>
      {loading ? <div className="flex items-center justify-center gap-3 p-12 text-sm text-[#81776e]"><Loader2 className="animate-spin" size={20} />Carregando clientes...</div> : <div className="divide-y divide-[#eee4d5]">{filtered.map(customer => <CustomerRow key={customer.id} customer={customer} onEdit={() => { setError(null); setView({ type: "edit", customer }); }} />)}{!filtered.length && <div className="p-12 text-center"><UserRound className="mx-auto text-[#b8aa99]" size={30} /><p className="mt-3 text-sm font-semibold">Nenhum cliente encontrado.</p><p className="mt-1 text-xs text-[#81776e]">Cadastre um novo contato ou tente outra busca.</p></div>}</div>}
      <div className="border-t border-[#eadfce] px-5 py-3 text-xs text-[#81776e]">Exibindo {filtered.length} de {customers.length} clientes</div>
    </section>
  </div>;
}

function CustomerRow({ customer, onEdit }: { customer: Customer; onEdit: () => void }) {
  return <article className="m-3 grid gap-3 rounded-xl border border-[#eadfce] p-4 md:m-0 md:grid-cols-[1.2fr_.9fr_.9fr_.8fr_64px] md:items-center md:rounded-none md:border-0 md:px-5"><div><p className="font-serif text-lg font-semibold">{customer.name}</p>{customer.notes && <p className="mt-0.5 line-clamp-1 text-xs text-[#8b8177]">{customer.notes}</p>}</div><p className="text-sm text-[#645c55]"><span className="mr-1 font-semibold md:hidden">Telefone:</span>{customer.phone}</p><p className="text-sm text-[#645c55]"><span className="mr-1 font-semibold md:hidden">Rede social:</span>{customer.socialNetwork ?? "—"}</p><span className="w-fit rounded-full bg-[#f2e7d8] px-2.5 py-1 text-[11px] font-bold text-[#6a5141]">{sourceLabel(customer.source)}</span><button type="button" onClick={onEdit} title="Editar cliente" aria-label={`Editar ${customer.name}`} className="justify-self-end rounded-lg p-2 text-[#756b62] hover:bg-[#eee4d5] hover:text-[#9c2348]"><Edit3 size={18} /></button></article>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) { return <div className="rounded-[18px] border border-[#e4d8c7] bg-[#fffdf8] p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#80766d]">{label}</p><Icon size={18} className="text-[#3f684e]" /></div><p className="mt-3 font-serif text-3xl">{value}</p></div>; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function createdThisMonth(customer: Customer) { const date = new Date(customer.createdAt); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(); }
function sourceLabel(source: CustomerSource | null) { return ({ INDICACAO: "Indicação", INSTAGRAM: "Instagram", WHATSAPP: "WhatsApp", FEIRA_EVENTO: "Feira ou evento", CATALOGO_SITE: "Catálogo ou site", OUTRO: "Outro" } as const)[source ?? "OUTRO"]; }
