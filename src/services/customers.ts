import { createClient } from "@/lib/supabase/client";
import type { CustomerValidated } from "@/schemas/customer";
import type { Customer, CustomerSource } from "@/types/customer";

type CustomerRow = {
  id: string;
  nome: string;
  telefone: string | null;
  rede_social: string | null;
  origem: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
};

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await createClient()
    .from("clientes")
    .select("id, nome, telefone, rede_social, origem, observacoes, ativo, created_at")
    .order("nome");

  if (error) throw customerError(error.message);
  return (data as CustomerRow[]).map(mapCustomer);
}

export async function createCustomer(input: CustomerValidated): Promise<void> {
  const { error } = await createClient().from("clientes").insert(toRow(input));
  if (error) throw customerError(error.message);
}

export async function updateCustomer(id: string, input: CustomerValidated): Promise<void> {
  const { error } = await createClient().from("clientes").update(toRow(input)).eq("id", id);
  if (error) throw customerError(error.message);
}

function toRow(input: CustomerValidated) {
  return {
    nome: input.name,
    telefone: input.phone,
    rede_social: input.socialNetwork,
    origem: input.source,
    observacoes: input.notes,
  };
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.nome,
    phone: row.telefone ?? "",
    socialNetwork: row.rede_social,
    source: row.origem as CustomerSource | null,
    notes: row.observacoes,
    active: row.ativo,
    createdAt: row.created_at,
  };
}

function customerError(message: string) {
  if (message.includes("row-level security") || message.includes("permission denied")) return new Error("Seu usuário não tem permissão para cadastrar clientes.");
  return new Error(message);
}
