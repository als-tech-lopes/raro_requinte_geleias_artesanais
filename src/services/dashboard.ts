import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/types/dashboard";

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [salesResult, productionsResult, productsResult, ingredientsResult, latestResult] = await Promise.all([
    supabase.from("vendas").select("id, valor_total").gte("data_venda", monthStart).neq("status", "CANCELADA"),
    supabase.from("producoes").select("id", { count: "exact", head: true }).gte("data_producao", monthStart.slice(0, 10)).neq("status", "CANCELADA"),
    supabase.from("produtos").select("id, nome, quantidade_disponivel").neq("status", "INATIVO").lte("quantidade_disponivel", 5).order("quantidade_disponivel").limit(8),
    supabase.from("ingredientes").select("id, nome, quantidade_disponivel, estoque_minimo, unidade_estoque").eq("ativo", true).order("quantidade_disponivel").limit(100),
    supabase.from("vendas").select("id, cliente_id, data_venda, valor_total, status").order("data_venda", { ascending: false }).limit(5),
  ]);

  const monthSales = salesResult.data ?? [];
  const saleIds = monthSales.map((sale) => sale.id);
  const itemsResult = saleIds.length
    ? await supabase.from("venda_itens").select("quantidade").in("venda_id", saleIds)
    : { data: [] as Array<{ quantidade: number }> };

  const latest = latestResult.data ?? [];
  const customerIds = latest.flatMap((sale) => sale.cliente_id ? [sale.cliente_id] : []);
  const customersResult = customerIds.length
    ? await supabase.from("clientes").select("id, nome").in("id", customerIds)
    : { data: [] as Array<{ id: string; nome: string }> };
  const customerNames = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer.nome]));

  const lowStockIngredients = (ingredientsResult.data ?? [])
    .filter((ingredient) => ingredient.quantidade_disponivel <= ingredient.estoque_minimo)
    .slice(0, 8)
    .map((ingredient) => ({ id: ingredient.id, name: ingredient.nome, quantity: ingredient.quantidade_disponivel, minimum: ingredient.estoque_minimo, unit: ingredient.unidade_estoque }));

  const lowStockProducts = (productsResult.data ?? []).map((product) => ({ id: product.id, name: product.nome, quantity: product.quantidade_disponivel }));

  return {
    revenue: monthSales.reduce((sum, sale) => sum + sale.valor_total, 0),
    salesCount: monthSales.length,
    productsSold: (itemsResult.data ?? []).reduce((sum, item) => sum + item.quantidade, 0),
    productionsCount: productionsResult.count ?? 0,
    lowStockCount: lowStockProducts.length + lowStockIngredients.length,
    latestSales: latest.map((sale) => ({ id: sale.id, date: sale.data_venda, total: sale.valor_total, status: sale.status, customer: sale.cliente_id ? customerNames.get(sale.cliente_id) ?? "Cliente não identificado" : "Venda avulsa" })),
    lowStockProducts,
    lowStockIngredients,
  };
}
