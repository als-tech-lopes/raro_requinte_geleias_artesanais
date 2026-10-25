"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { customerSchema, type CustomerFormValues, type CustomerValidated } from "@/schemas/customer";
import type { Customer } from "@/types/customer";

const defaults: CustomerFormValues = { name: "", phone: "", socialNetwork: "", source: "INDICACAO", notes: "" };
const inputClass = "w-full rounded-xl border border-[#dfd3c2] bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-[#aaa097] focus:border-[#9c2348] focus:ring-2 focus:ring-[#9c2348]/10";

export function CustomerForm({ customer, submitError, onCancel, onSave }: { customer?: Customer; submitError?: string | null; onCancel: () => void; onSave: (value: CustomerValidated) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CustomerFormValues, unknown, CustomerValidated>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      name: customer.name,
      phone: customer.phone,
      socialNetwork: customer.socialNetwork ?? "",
      source: customer.source ?? "INDICACAO",
      notes: customer.notes ?? "",
    } : defaults,
  });

  return <section className="animate-rise mx-auto max-w-3xl">
    <button type="button" onClick={onCancel} className="mb-5 flex items-center gap-2 text-sm font-medium text-[#6f665d] hover:text-[#9c2348]"><ArrowLeft size={17} />Voltar para clientes</button>
    <div className="overflow-hidden rounded-[22px] border border-[#e4d8c7] bg-[#fffdf8] shadow-[0_16px_45px_rgba(69,47,31,.08)]">
      <div className="flex items-start gap-4 border-b border-[#eadfce] px-6 py-5 sm:px-8">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f2e7d8] text-[#9c2348]"><UserRound size={21} /></span>
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Cadastro</p><h2 className="mt-1 font-serif text-3xl">{customer ? "Editar cliente" : "Novo cliente"}</h2><p className="mt-1 text-sm text-[#786f66]">Mantenha os dados essenciais para contato e relacionamento.</p></div>
      </div>
      <form onSubmit={handleSubmit(onSave)} className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
        {submitError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 sm:col-span-2"><strong className="block">Não foi possível salvar o cliente.</strong>{submitError}</div>}
        <Field label="Nome" error={errors.name?.message}><input autoFocus autoComplete="name" className={inputClass} {...register("name")} placeholder="Ex.: Maria da Silva" /></Field>
        <Field label="Telefone" error={errors.phone?.message} hint="Informe o DDD. Aceitamos celular ou telefone fixo."><input type="tel" inputMode="tel" autoComplete="tel" className={inputClass} {...register("phone")} placeholder="(11) 99999-9999" /></Field>
        <Field label="Rede social (opcional)" error={errors.socialNetwork?.message} hint="Pode ser o @usuário ou o link do perfil."><input className={inputClass} {...register("socialNetwork")} placeholder="Ex.: @mariadasilva" /></Field>
        <Field label="Como chegou até nós?" error={errors.source?.message}><select className={inputClass} {...register("source")}><option value="INDICACAO">Indicação</option><option value="INSTAGRAM">Instagram</option><option value="WHATSAPP">WhatsApp</option><option value="FEIRA_EVENTO">Feira ou evento</option><option value="CATALOGO_SITE">Catálogo ou site</option><option value="OUTRO">Outro</option></select></Field>
        <Field label="Observações (opcional)" error={errors.notes?.message} hint="Preferências, melhor horário para contato ou alguma informação útil."><textarea rows={3} className={`${inputClass} resize-y sm:min-h-24`} {...register("notes")} placeholder="Adicione uma observação breve" /></Field>
        <div className="flex items-end justify-end gap-3 sm:col-start-2"><button type="button" onClick={onCancel} className="rounded-xl border border-[#d8cbb9] px-5 py-2.5 text-sm font-semibold hover:bg-[#f7f1e5]">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex min-w-40 items-center justify-center gap-2 rounded-xl bg-[#9c2348] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#7f1c3a] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? <><Loader2 className="animate-spin" size={17} />Salvando...</> : <><Save size={17} />Salvar cliente</>}</button></div>
      </form>
    </div>
  </section>;
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#4b443e]">{label}{children}{error ? <span className="text-xs font-normal text-red-700">{error}</span> : hint ? <span className="text-xs font-normal text-[#81776e]">{hint}</span> : null}</label>;
}
