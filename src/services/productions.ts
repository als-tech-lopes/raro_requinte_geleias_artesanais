import { createClient } from "@/lib/supabase/client";
import type { MeasurementUnit } from "@/types/ingredient";
import type { CompletionResult, Production, ProductionRecipe, ProductionSaveInput, ProductionStatus } from "@/types/production";

type Relation<T> = T | T[] | null;
const one = <T,>(value: Relation<T> | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;

type RecipeRow = {
  id: string; nome: string; produto_id: string | null; rendimento_estimado_g: number; rendimento_potes: number; peso_pote_g: number;
  produtos?: Relation<{ id: string; nome: string; peso_liquido: number; unidade: MeasurementUnit; status: string }>;
  receita_itens?: Array<{ ingrediente_id: string; quantidade: number; unidade: MeasurementUnit; ingredientes?: Relation<{ nome: string; unidade_estoque: MeasurementUnit; quantidade_disponivel: number; custo_medio: number; ativo: boolean; categorias_ingredientes?: Relation<{ slug: string }> }> }>;
};

type ProductionRow = {
  id: string; receita_id: string; produto_id: string; data_producao: string; multiplicador_receita: number;
  quantidade_planejada: number; quantidade_produzida: number | null; lote: string | null; validade: string | null;
  status: ProductionStatus; peso_final_g: number | null; motivo_diferenca: string | null; custo_ingredientes: number;
  custo_embalagens: number; custo_real: number; custo_por_pote: number | null; observacoes: string | null;
  concluida_em: string | null; created_at: string; updated_at: string;
  receitas?: Relation<{ nome: string; peso_pote_g: number }>;
  produtos?: Relation<{ nome: string }>;
  producao_itens?: Array<{ id: string; ingrediente_id: string; quantidade_prevista: number; quantidade_utilizada: number; unidade: MeasurementUnit; custo_unitario: number; custo_total: number; tipo_custo: "INGREDIENTE" | "EMBALAGEM"; ingredientes?: Relation<{ nome: string; quantidade_disponivel: number }> }>;
  lotes_produtos?: Array<{ id: string; codigo: string; data_producao: string; validade: string; quantidade_inicial: number; quantidade_disponivel: number }>;
  movimentacoes_estoque?: Array<{ id: string; item_tipo: "INGREDIENTE" | "PRODUTO"; ingrediente_id: string | null; produto_id: string | null; quantidade: number; unidade_item: MeasurementUnit | null; created_at: string; ingredientes?: Relation<{ nome: string }>; produtos?: Relation<{ nome: string }> }>;
};

export async function listProductionRecipes(): Promise<ProductionRecipe[]> {
  const { data, error } = await createClient().from("receitas").select("id, nome, produto_id, rendimento_estimado_g, rendimento_potes, peso_pote_g, produtos(id, nome, peso_liquido, unidade, status), receita_itens(ingrediente_id, quantidade, unidade, ingredientes(nome, unidade_estoque, quantidade_disponivel, custo_medio, ativo, categorias_ingredientes(slug)))").eq("ativa", true).not("produto_id", "is", null).order("nome");
  if (error) throw friendlyError(error.message);
  return (data as unknown as RecipeRow[]).flatMap(row => {
    const product = one(row.produtos);
    if (!product || product.status === "INATIVO") return [];
    const items = (row.receita_itens ?? []).flatMap(item => {
      const ingredient = one(item.ingredientes);
      if (!ingredient || !ingredient.ativo) return [];
      return [{ ingredientId: item.ingrediente_id, ingredientName: ingredient.nome, recipeQuantity: Number(item.quantidade), recipeUnit: item.unidade, stockUnit: ingredient.unidade_estoque, stockQuantity: Number(ingredient.quantidade_disponivel), averageCost: Number(ingredient.custo_medio), costType: one(ingredient.categorias_ingredientes)?.slug === "embalagens" ? "EMBALAGEM" as const : "INGREDIENTE" as const }];
    });
    if (items.length !== (row.receita_itens ?? []).length || !items.length) return [];
    const productWeightG = product.unidade === "kg" ? Number(product.peso_liquido) * 1000 : product.unidade === "g" ? Number(product.peso_liquido) : Number(row.peso_pote_g);
    return [{ id: row.id, name: row.nome, productId: product.id, productName: product.nome, productWeightG, expectedYieldG: Number(row.rendimento_estimado_g), expectedJars: Number(row.rendimento_potes), jarWeightG: Number(row.peso_pote_g), items }];
  });
}

const productionSelect = "id, receita_id, produto_id, data_producao, multiplicador_receita, quantidade_planejada, quantidade_produzida, lote, validade, status, peso_final_g, motivo_diferenca, custo_ingredientes, custo_embalagens, custo_real, custo_por_pote, observacoes, concluida_em, created_at, updated_at, receitas(nome, peso_pote_g), produtos(nome), producao_itens(id, ingrediente_id, quantidade_prevista, quantidade_utilizada, unidade, custo_unitario, custo_total, tipo_custo, ingredientes(nome, quantidade_disponivel)), lotes_produtos(id, codigo, data_producao, validade, quantidade_inicial, quantidade_disponivel), movimentacoes_estoque(id, item_tipo, ingrediente_id, produto_id, quantidade, unidade_item, created_at, ingredientes(nome), produtos(nome))";

export async function listProductions(): Promise<Production[]> {
  const { data, error } = await createClient().from("producoes").select(productionSelect).order("data_producao", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw friendlyError(error.message);
  return (data as unknown as ProductionRow[]).map(mapProduction);
}

export async function getExpirationAlertDays(): Promise<number> {
  const { data, error } = await createClient().rpc("obter_dias_alerta_validade");
  if (error) throw friendlyError(error.message);
  return Number(data ?? 30);
}

function mapProduction(row: ProductionRow): Production {
  const recipe = one(row.receitas); const product = one(row.produtos); const batch = row.lotes_produtos?.[0] ?? null;
  return {
    id: row.id, recipeId: row.receita_id, recipeName: recipe?.nome ?? "Receita indisponível", productId: row.produto_id,
    productName: product?.nome ?? "Produto indisponível", productionDate: row.data_producao, multiplier: Number(row.multiplicador_receita),
    plannedQuantity: Number(row.quantidade_planejada), producedQuantity: row.quantidade_produzida === null ? null : Number(row.quantidade_produzida),
    batchCode: row.lote, expirationDate: row.validade, status: row.status, finalWeightG: row.peso_final_g === null ? null : Number(row.peso_final_g),
    yieldDifferenceReason: row.motivo_diferenca, ingredientCost: Number(row.custo_ingredientes), packagingCost: Number(row.custo_embalagens),
    directCost: Number(row.custo_real), costPerJar: row.custo_por_pote === null ? null : Number(row.custo_por_pote), notes: row.observacoes,
    completedAt: row.concluida_em, createdAt: row.created_at, updatedAt: row.updated_at, jarWeightG: Number(recipe?.peso_pote_g ?? 0),
    items: (row.producao_itens ?? []).map(item => ({ id: item.id, ingredientId: item.ingrediente_id, ingredientName: one(item.ingredientes)?.nome ?? "Ingrediente indisponível", planned: Number(item.quantidade_prevista), used: Number(item.quantidade_utilizada), unit: item.unidade, unitCost: Number(item.custo_unitario), totalCost: Number(item.custo_total), costType: item.tipo_custo, currentStock: Number(one(item.ingredientes)?.quantidade_disponivel ?? 0) })),
    movements: (row.movimentacoes_estoque ?? []).map(item => ({ id: item.id, itemType: item.item_tipo, itemName: item.item_tipo === "INGREDIENTE" ? one(item.ingredientes)?.nome ?? "Ingrediente" : one(item.produtos)?.nome ?? "Produto", quantity: Number(item.quantidade), unit: item.unidade_item ?? "unidade", date: item.created_at })),
    batch: batch ? { id: batch.id, code: batch.codigo, productionDate: batch.data_producao, expirationDate: batch.validade, initialQuantity: Number(batch.quantidade_inicial), availableQuantity: Number(batch.quantidade_disponivel) } : null,
  };
}

export async function saveProductionDraft(id: string | null, input: ProductionSaveInput): Promise<string> {
  const { data, error } = await createClient().rpc("salvar_producao_em_preparo", {
    p_producao_id: id, p_receita_id: input.recipeId, p_multiplicador: input.multiplier, p_data_producao: input.productionDate,
    p_quantidade_produzida: input.producedQuantity, p_validade: input.expirationDate, p_peso_final_g: input.finalWeightG,
    p_observacoes: input.notes, p_motivo_diferenca: input.yieldDifferenceReason,
    p_itens: input.items.map(item => ({ ingrediente_id: item.ingredientId, quantidade_utilizada: item.used })),
  });
  if (error) throw friendlyError(error.message);
  return data;
}

export async function completeProduction(id: string): Promise<CompletionResult> {
  const { data, error } = await createClient().rpc("concluir_producao", { p_producao_id: id });
  if (error) throw friendlyError(error.message);
  return data as unknown as CompletionResult;
}

export async function cancelProduction(id: string, reason: string): Promise<void> {
  const { error } = await createClient().rpc("cancelar_producao_em_preparo", { p_producao_id: id, p_motivo: reason });
  if (error) throw friendlyError(error.message);
}

export async function registerProductionLoss(id: string, reason: string): Promise<void> {
  const { error } = await createClient().rpc("registrar_perda_producao", { p_producao_id: id, p_motivo: reason });
  if (error) throw friendlyError(error.message);
}

function friendlyError(message: string) {
  if (message.includes("Estoque insuficiente")) return new Error(message);
  if (message.includes("já foi concluída")) return new Error("Essa produção já foi concluída e não pode ser finalizada novamente.");
  if (message.includes("Acesso negado")) return new Error("Seu usuário não tem permissão para esta operação.");
  if (message.includes("violates check constraint")) return new Error("Revise os dados informados antes de continuar.");
  return new Error(message);
}
