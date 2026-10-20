import { createClient } from "@/lib/supabase/client";
import type { RecipeValidated } from "@/schemas/recipe";
import type { Recipe, RecipeCatalogIngredient, RecipeProduct } from "@/types/recipe";
import type { MeasurementUnit } from "@/types/ingredient";

type RecipeRow = {
  id: string; nome: string; produto_id: string | null; descricao: string | null;
  modo_preparo: string | null; rendimento_estimado_g: number; peso_pote_g: number;
  rendimento_potes: number; observacoes: string | null; ativa: boolean; versao: number;
  receita_origem_id: string | null; created_at: string; updated_at: string;
  produtos?: { nome: string } | { nome: string }[] | null;
  receita_itens?: Array<{
    id: string; ingrediente_id: string; quantidade: number; unidade: MeasurementUnit;
    ingredientes?: { nome: string; unidade_estoque: MeasurementUnit; custo_medio: number } | { nome: string; unidade_estoque: MeasurementUnit; custo_medio: number }[] | null;
  }>;
};

function one<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }

function mapRecipe(row: RecipeRow): Recipe {
  const product = one(row.produtos);
  return {
    id: row.id, name: row.nome, productId: row.produto_id, productName: product?.nome ?? null,
    description: row.descricao, preparation: row.modo_preparo,
    expectedYieldG: Number(row.rendimento_estimado_g), jarWeightG: Number(row.peso_pote_g),
    expectedJars: Number(row.rendimento_potes), notes: row.observacoes, active: row.ativa,
    version: row.versao, originId: row.receita_origem_id, createdAt: row.created_at, updatedAt: row.updated_at,
    items: (row.receita_itens ?? []).map(item => {
      const ingredient = one(item.ingredientes);
      return { id: item.id, ingredientId: item.ingrediente_id, ingredientName: ingredient?.nome ?? "Ingrediente indisponível", quantity: Number(item.quantidade), unit: item.unidade, stockUnit: ingredient?.unidade_estoque ?? item.unidade, averageCost: Number(ingredient?.custo_medio ?? 0) };
    }),
  };
}

const recipeSelect = "id, nome, produto_id, descricao, modo_preparo, rendimento_estimado_g, peso_pote_g, rendimento_potes, observacoes, ativa, versao, receita_origem_id, created_at, updated_at, produtos(nome), receita_itens(id, ingrediente_id, quantidade, unidade, ingredientes(nome, unidade_estoque, custo_medio))";

export async function listRecipes(): Promise<Recipe[]> {
  const { data, error } = await createClient().from("receitas").select(recipeSelect).order("updated_at", { ascending: false });
  if (error) throw friendlyError(error.message);
  return (data as unknown as RecipeRow[]).map(mapRecipe);
}

export async function listRecipeCatalog(): Promise<{ ingredients: RecipeCatalogIngredient[]; products: RecipeProduct[] }> {
  const supabase = createClient();
  const [ingredientsResult, productsResult] = await Promise.all([
    supabase.from("ingredientes").select("id, nome, unidade_estoque, custo_medio, ativo").eq("ativo", true).order("nome"),
    supabase.from("produtos").select("id, nome").neq("status", "INATIVO").order("nome"),
  ]);
  if (ingredientsResult.error) throw friendlyError(ingredientsResult.error.message);
  if (productsResult.error) throw friendlyError(productsResult.error.message);
  return {
    ingredients: (ingredientsResult.data ?? []).map(item => ({ id: item.id, name: item.nome, unit: item.unidade_estoque, averageCost: Number(item.custo_medio), active: item.ativo })),
    products: (productsResult.data ?? []).map(item => ({ id: item.id, name: item.nome })),
  };
}

export async function saveRecipe(id: string | null, input: RecipeValidated): Promise<string> {
  const { data, error } = await createClient().rpc("salvar_receita", {
    p_receita_id: id, p_nome: input.name, p_produto_id: input.productId,
    p_descricao: input.description, p_modo_preparo: input.preparation,
    p_rendimento_estimado_g: input.expectedYieldG, p_peso_pote_g: input.jarWeightG,
    p_observacoes: input.notes, p_ativa: input.active,
    p_itens: input.items.map(item => ({ ingrediente_id: item.ingredientId, quantidade: item.quantity, unidade: item.unit })),
  });
  if (error) throw friendlyError(error.message);
  return data;
}

export async function inactivateRecipe(id: string): Promise<void> {
  const { error } = await createClient().rpc("inativar_receita", { p_receita_id: id });
  if (error) throw friendlyError(error.message);
}

function friendlyError(message: string) {
  if (message.includes("duplicate key")) return new Error("Já existe uma receita com essa identificação.");
  if (message.includes("Conversão incompatível")) return new Error("Uma das unidades escolhidas não pode ser convertida para a unidade do ingrediente.");
  if (message.includes("Acesso negado")) return new Error("Seu usuário não tem permissão para esta operação.");
  return new Error(message);
}
