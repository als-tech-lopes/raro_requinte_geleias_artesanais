import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { productSchema, type ProductValidated } from "@/schemas/product";
import type { Product, ProductStatus } from "@/types/product";

type ProductRow = {
  id: string; nome: string; slug: string; descricao_curta: string;
  descricao: string | null; peso_liquido: number; unidade: string;
  preco_venda: number; custo_estimado: number; quantidade_disponivel: number;
  status: "ATIVO" | "INATIVO" | "ESGOTADO"; destaque: boolean;
  imagem_principal_path: string | null; created_at: string; updated_at: string;
  categorias_produtos?: { nome: string } | { nome: string }[] | null;
};

export const isDemoMode = () => !hasSupabaseConfig();

export function getProductImageUrl(path: string | null) {
  if (!path || isDemoMode()) return null;
  return createClient().storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

function toProduct(row: ProductRow): Product {
  const category = Array.isArray(row.categorias_produtos) ? row.categorias_produtos[0]?.nome : row.categorias_produtos?.nome;
  return {
    id: row.id, name: row.nome, slug: row.slug, short_description: row.descricao_curta,
    description: row.descricao, category: category ?? "Sem categoria",
    net_weight: Number(row.peso_liquido), unit: row.unidade,
    sale_price: Number(row.preco_venda), estimated_cost: Number(row.custo_estimado),
    stock_quantity: Number(row.quantidade_disponivel), status: row.status.toLowerCase() as ProductStatus,
    featured: row.destaque, main_image_path: row.imagem_principal_path,
    created_at: row.created_at, updated_at: row.updated_at,
  };
}

async function getCategoryId(name: string) {
  const { data, error } = await createClient().from("categorias_produtos").select("id").eq("nome", name).eq("ativo", true).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Cadastre e ative a categoria “${name}” antes de salvar o produto.`);
  return data.id as string;
}

function toDatabasePayload(input: ProductValidated, categoryId: string) {
  return {
    categoria_id: categoryId, nome: input.name, slug: input.slug,
    descricao_curta: input.short_description, descricao: input.description,
    peso_liquido: input.net_weight, unidade: input.unit,
    preco_venda: input.sale_price, custo_estimado: input.estimated_cost,
    status: input.status.toUpperCase(), destaque: input.featured,
    imagem_principal_path: input.main_image_path,
  };
}

export async function listProducts(): Promise<Product[]> {
  if (isDemoMode()) return [];
  const { data, error } = await createClient().from("produtos").select("*, categorias_produtos(nome)").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ProductRow[]).map(toProduct);
}

export async function createProduct(input: ProductValidated): Promise<Product> {
  const payload = productSchema.parse(input);
  const categoryId = await getCategoryId(payload.category);
  const supabase = createClient();
  const { data, error } = await supabase.from("produtos").insert(toDatabasePayload(payload, categoryId)).select("*, categorias_produtos(nome)").single();
  if (error) throw new Error(error.message);
  if (payload.stock_quantity > 0) {
    const { error: stockError } = await supabase.rpc("ajustar_estoque", { p_item_tipo: "PRODUTO", p_item_id: data.id, p_novo_saldo: payload.stock_quantity, p_observacoes: "Estoque inicial do cadastro do produto" });
    if (stockError) throw new Error(stockError.message);
    data.quantidade_disponivel = payload.stock_quantity;
  }
  return toProduct(data as ProductRow);
}

export async function updateProduct(id: string, input: ProductValidated): Promise<Product> {
  const payload = productSchema.parse(input);
  const categoryId = await getCategoryId(payload.category);
  const supabase = createClient();
  const { data: current, error: readError } = await supabase.from("produtos").select("quantidade_disponivel").eq("id", id).single();
  if (readError) throw new Error(readError.message);
  if (Number(current.quantidade_disponivel) !== payload.stock_quantity) {
    const { error: stockError } = await supabase.rpc("ajustar_estoque", { p_item_tipo: "PRODUTO", p_item_id: id, p_novo_saldo: payload.stock_quantity, p_observacoes: "Ajuste realizado no cadastro do produto" });
    if (stockError) throw new Error(stockError.message);
  }
  const { data, error } = await supabase.from("produtos").update(toDatabasePayload(payload, categoryId)).eq("id", id).select("*, categorias_produtos(nome)").single();
  if (error) throw new Error(error.message);
  return toProduct(data as ProductRow);
}

export async function deleteProduct(id: string) {
  const { error } = await createClient().from("produtos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadProductImages(productId: string, files: File[]) {
  const supabase = createClient();
  const uploaded: string[] = [];
  for (const file of files) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `${productId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { error: metadataError } = await supabase.from("produto_imagens").insert({ produto_id: productId, storage_path: path, alt_text: file.name, ordem: uploaded.length });
    if (metadataError) throw new Error(metadataError.message);
    uploaded.push(path);
  }
  if (uploaded.length) {
    const { error } = await supabase.from("produtos").update({ imagem_principal_path: uploaded[0] }).eq("id", productId);
    if (error) throw new Error(error.message);
  }
  return uploaded;
}
