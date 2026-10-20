import { createClient } from "@/lib/supabase/client";
import type { AdjustmentValidated, IngredientValidated, PurchaseValidated } from "@/schemas/ingredient";
import type { Ingredient, IngredientCategory, IngredientMovement } from "@/types/ingredient";

type IngredientRow = {
  id: string; nome: string; categoria_id: string; unidade_estoque: Ingredient["unit"];
  custo_medio: number; quantidade_disponivel: number; estoque_minimo: number;
  observacoes: string | null; ativo: boolean; created_at: string; updated_at: string;
  categorias_ingredientes?: { nome: string } | { nome: string }[] | null;
};

function mapIngredient(row: IngredientRow): Ingredient {
  const category = Array.isArray(row.categorias_ingredientes) ? row.categorias_ingredientes[0] : row.categorias_ingredientes;
  return { id: row.id, name: row.nome, categoryId: row.categoria_id, categoryName: category?.nome ?? "Sem categoria", unit: row.unidade_estoque, averageCost: Number(row.custo_medio), quantity: Number(row.quantidade_disponivel), minimumStock: Number(row.estoque_minimo), notes: row.observacoes, active: row.ativo, createdAt: row.created_at, updatedAt: row.updated_at };
}

export async function listIngredientCategories(): Promise<IngredientCategory[]> {
  const { data, error } = await createClient().from("categorias_ingredientes").select("id, nome, slug").eq("ativa", true).order("ordem").order("nome");
  if (error) throw friendlyError(error.message);
  return (data ?? []).map(category => ({ id: category.id, name: category.nome, slug: category.slug }));
}

export async function listIngredients(): Promise<Ingredient[]> {
  const { data, error } = await createClient().from("ingredientes").select("id, nome, categoria_id, unidade_estoque, custo_medio, quantidade_disponivel, estoque_minimo, observacoes, ativo, created_at, updated_at, categorias_ingredientes(nome)").order("nome");
  if (error) throw friendlyError(error.message);
  return (data as IngredientRow[]).map(mapIngredient);
}

export async function createIngredient(input: IngredientValidated): Promise<void> {
  const { error } = await createClient().rpc("cadastrar_ingrediente", { p_nome: input.name, p_categoria_id: input.categoryId, p_unidade_estoque: input.unit, p_estoque_minimo: input.minimumStock, p_quantidade_inicial: input.initialQuantity, p_valor_total_inicial: input.initialTotalValue, p_observacoes: input.notes ?? undefined });
  if (error) throw friendlyError(error.message);
}

export async function updateIngredient(id: string, input: IngredientValidated): Promise<void> {
  const { error } = await createClient().from("ingredientes").update({ nome: input.name, categoria_id: input.categoryId, estoque_minimo: input.minimumStock, observacoes: input.notes, ativo: input.active }).eq("id", id);
  if (error) throw friendlyError(error.message);
}

export async function registerIngredientPurchase(id: string, input: PurchaseValidated): Promise<void> {
  const { error } = await createClient().rpc("registrar_compra_ingrediente", { p_ingrediente_id: id, p_quantidade: input.quantity, p_unidade: input.unit, p_valor_total: input.totalValue, p_data_compra: input.purchaseDate, p_observacoes: input.notes ?? undefined });
  if (error) throw friendlyError(error.message);
}

export async function adjustIngredientStock(id: string, input: AdjustmentValidated): Promise<void> {
  const { error } = await createClient().rpc("ajustar_estoque_ingrediente", { p_ingrediente_id: id, p_novo_saldo: input.newBalance, p_motivo: input.reason, p_observacoes: input.notes ?? undefined });
  if (error) throw friendlyError(error.message);
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await createClient().rpc("excluir_ingrediente", { p_ingrediente_id: id });
  if (error) throw friendlyError(error.message);
}

export async function inactivateIngredient(id: string): Promise<void> {
  const { error } = await createClient().from("ingredientes").update({ ativo: false }).eq("id", id);
  if (error) throw friendlyError(error.message);
}

export async function listIngredientMovements(id: string): Promise<IngredientMovement[]> {
  const { data, error } = await createClient().from("movimentacoes_estoque").select("id, created_at, tipo, origem, quantidade, saldo_posterior, unidade_item, custo_unitario, valor_total, observacoes").eq("ingrediente_id", id).order("created_at", { ascending: false });
  if (error) throw friendlyError(error.message);
  return (data ?? []).map(row => ({ id: row.id, date: row.created_at, type: row.tipo, origin: row.origem, quantity: Number(row.quantidade), balanceAfter: Number(row.saldo_posterior), unit: row.unidade_item ?? "unidade", unitCost: Number(row.custo_unitario ?? 0), totalValue: Number(row.valor_total ?? 0), notes: row.observacoes }));
}

function friendlyError(message: string): Error {
  if (message.includes("ingredientes_nome_normalizado_unique") || message.includes("ingredientes_nome_unique")) return new Error("Já existe um ingrediente com esse nome. Use outro nome ou edite o ingrediente existente.");
  if (message.includes("Acesso negado")) return new Error("Seu usuário não tem permissão para realizar esta operação.");
  if (message.includes("possui historico")) return new Error("Este ingrediente possui histórico e não pode ser excluído. Inative-o para preservar os registros.");
  if (message.includes("sem estoque podem ser excluidos")) return new Error("Somente ingredientes sem estoque podem ser excluídos.");
  if (message.includes("Conversão incompatível")) return new Error("A unidade informada não pode ser convertida para a unidade deste ingrediente.");
  return new Error(message);
}
