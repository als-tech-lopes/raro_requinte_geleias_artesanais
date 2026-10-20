import { createClient } from "@/lib/supabase/client";
import type { PaymentMethod, Sale, SaleCustomer, SaleInput, SaleProduct, SaleResult, SaleStatus } from "@/types/sale";

type Rel<T> = T | T[] | null;
const one = <T,>(value: Rel<T> | undefined) => Array.isArray(value) ? value[0] ?? null : value ?? null;

export async function listSaleCatalog(): Promise<{ customers: SaleCustomer[]; products: SaleProduct[] }> {
  const supabase = createClient();
  const [customers, products] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone, whatsapp").eq("ativo", true).order("nome"),
    supabase.from("produtos").select("id, nome, peso_liquido, unidade, preco_venda, quantidade_disponivel, imagem_principal_path, lotes_produtos(quantidade_disponivel, validade, bloqueado)").eq("status", "ATIVO").gt("quantidade_disponivel", 0).order("nome"),
  ]);
  if (customers.error) throw friendlyError(customers.error.message);
  if (products.error) throw friendlyError(products.error.message);
  const today = localIsoDate();
  return {
    customers: (customers.data ?? []).map(item => ({ id: item.id, name: item.nome, phone: item.telefone, whatsapp: item.whatsapp })),
    products: (products.data ?? []).flatMap(item => {
      const lots = (item.lotes_produtos ?? []) as Array<{ quantidade_disponivel: number; validade: string; bloqueado: boolean }>;
      const eligible = lots.length ? lots.filter(lot => !lot.bloqueado && lot.validade >= today).reduce((sum, lot) => sum + Number(lot.quantidade_disponivel), 0) : Number(item.quantidade_disponivel);
      const imageUrl = item.imagem_principal_path
        ? supabase.storage.from("product-images").getPublicUrl(item.imagem_principal_path).data.publicUrl
        : null;
      return eligible > 0 ? [{ id: item.id, name: item.nome, weight: Number(item.peso_liquido), unit: item.unidade, price: Number(item.preco_venda), eligibleStock: eligible, consolidatedStock: Number(item.quantidade_disponivel), imagePath: imageUrl }] : [];
    }),
  };
}

type SaleRow = {
  id: string; numero: string; cliente_id: string | null; data_venda: string; subtotal: number; desconto_total: number; taxa_entrega: number; valor_total: number; forma_pagamento: PaymentMethod; status: SaleStatus; observacoes: string | null; entregue: boolean; cancelada_em: string | null;
  clientes?: Rel<{ nome: string; telefone: string | null; whatsapp: string | null }>;
  profiles?: Rel<{ nome: string }>;
  venda_itens?: Array<{ id: string; produto_id: string; produto_nome: string; quantidade: number; preco_unitario: number; desconto: number; subtotal: number; venda_item_lotes?: Array<{ quantidade: number; lotes_produtos?: Rel<{ codigo: string; validade: string }> }> }>;
  pagamentos?: Array<{ id: string; valor: number; forma_pagamento: PaymentMethod; recebido_em: string }>;
  estornos_financeiros?: Array<{ id: string; valor: number; status: "PENDENTE" | "REALIZADO"; motivo: string; created_at: string; realizado_em: string | null }>;
};

export async function listSales(): Promise<Sale[]> {
  const { data, error } = await createClient().from("vendas").select("id, numero, cliente_id, data_venda, subtotal, desconto_total, taxa_entrega, valor_total, forma_pagamento, status, observacoes, entregue, cancelada_em, clientes(nome, telefone, whatsapp), profiles!vendas_criado_por_fkey(nome), venda_itens(id, produto_id, produto_nome, quantidade, preco_unitario, desconto, subtotal, venda_item_lotes(quantidade, lotes_produtos(codigo, validade))), pagamentos(id, valor, forma_pagamento, recebido_em), estornos_financeiros(id, valor, status, motivo, created_at, realizado_em)").order("data_venda", { ascending: false });
  if (error) throw friendlyError(error.message);
  return (data as unknown as SaleRow[]).map(mapSale);
}

function mapSale(row: SaleRow): Sale {
  const customer = one(row.clientes); const payment = row.pagamentos?.[0] ?? null; const refund = row.estornos_financeiros?.[0] ?? null;
  return { id: row.id, number: row.numero, date: row.data_venda, customerId: row.cliente_id, customerName: customer?.nome ?? null, customerPhone: customer?.whatsapp ?? customer?.telefone ?? null, subtotal: Number(row.subtotal), discount: Number(row.desconto_total), deliveryFee: Number(row.taxa_entrega), total: Number(row.valor_total), paymentMethod: row.forma_pagamento, status: row.status, notes: row.observacoes, delivered: row.entregue, canceledAt: row.cancelada_em, createdByName: one(row.profiles)?.nome ?? "Usuário", items: (row.venda_itens ?? []).map(item => ({ id: item.id, productId: item.produto_id, productName: item.produto_nome, quantity: item.quantidade, unitPrice: Number(item.preco_unitario), discount: Number(item.desconto), subtotal: Number(item.subtotal), lots: (item.venda_item_lotes ?? []).map(allocation => ({ code: one(allocation.lotes_produtos)?.codigo ?? "Lote", expirationDate: one(allocation.lotes_produtos)?.validade ?? "", quantity: allocation.quantidade })) })), payment: payment ? { id: payment.id, value: Number(payment.valor), method: payment.forma_pagamento, receivedAt: payment.recebido_em } : null, refund: refund ? { id: refund.id, value: Number(refund.valor), status: refund.status, reason: refund.motivo, createdAt: refund.created_at, realizedAt: refund.realizado_em } : null };
}

export async function registerSale(input: SaleInput): Promise<SaleResult> {
  const { data, error } = await createClient().rpc("registrar_venda_segura", { p_chave_idempotencia: input.idempotencyKey, p_cliente_id: input.customerId, p_forma_pagamento: input.paymentMethod, p_itens: input.items.map(item => ({ produto_id: item.productId, quantidade: item.quantity })), p_desconto_total: input.discount, p_taxa_entrega: input.deliveryFee, p_observacoes: input.notes, p_status: input.status });
  if (error) throw friendlyError(error.message);
  return data as unknown as SaleResult;
}

export async function registerSalePayment(id: string, method: PaymentMethod) { const { error } = await createClient().rpc("registrar_pagamento_venda", { p_venda_id: id, p_forma_pagamento: method }); if (error) throw friendlyError(error.message); }
export async function cancelSale(id: string, reason: string, returnStock: boolean, refundDone: boolean) { const { error } = await createClient().rpc("cancelar_venda_segura", { p_venda_id: id, p_motivo: reason, p_retornar_estoque: returnStock, p_estorno_realizado: refundDone }); if (error) throw friendlyError(error.message); }
export async function confirmSaleRefund(id: string) { const { error } = await createClient().rpc("confirmar_estorno_financeiro", { p_venda_id: id }); if (error) throw friendlyError(error.message); }
export async function quickCreateCustomer(name: string, phone: string): Promise<SaleCustomer> { const { data, error } = await createClient().from("clientes").insert({ nome: name.trim(), telefone: phone.trim() }).select("id, nome, telefone, whatsapp").single(); if (error) throw friendlyError(error.message); return { id: data.id, name: data.nome, phone: data.telefone, whatsapp: data.whatsapp }; }

function friendlyError(message: string) { if (message.includes("Estoque")) return new Error(message); if (message.includes("já foi")) return new Error(message); if (message.includes("Acesso negado")) return new Error("Seu usuário não tem permissão para esta operação."); return new Error(message); }
function localIsoDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
