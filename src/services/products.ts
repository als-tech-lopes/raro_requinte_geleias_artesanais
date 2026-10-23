import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { productSchema, slugify, type ProductValidated } from "@/schemas/product";
import type { TablesInsert, TablesUpdate } from "@/types/database";
import type { Product, ProductDeletionStatus, ProductStatus, ProductUnit } from "@/types/product";

type ProductRow = {
  id: string; nome: string; slug: string; descricao_curta: string;
  descricao: string | null; peso_liquido: number; unidade: string;
  preco_venda: number; custo_estimado: number; quantidade_disponivel: number;
  status: "ATIVO" | "INATIVO" | "ESGOTADO"; destaque: boolean;
  publicado: boolean; imagem_principal_path: string | null;
  ingredientes_publicos: string | null; conservacao: string | null; alergenos: string | null; observacoes_rotulagem: string | null;
  created_at: string; updated_at: string;
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
    net_weight: Number(row.peso_liquido), unit: row.unidade as ProductUnit,
    sale_price: Number(row.preco_venda), estimated_cost: Number(row.custo_estimado),
    stock_quantity: Number(row.quantidade_disponivel), status: row.status.toLowerCase() as ProductStatus,
    featured: row.destaque, published: row.publicado, main_image_path: row.imagem_principal_path,
    public_ingredients: row.ingredientes_publicos, conservation: row.conservacao,
    allergens: row.alergenos, label_notes: row.observacoes_rotulagem,
    created_at: row.created_at, updated_at: row.updated_at,
  };
}

async function getOrCreateCategoryId(name: string) {
  const supabase = createClient();
  const normalizedName = name.trim();
  const { data: category, error: readError } = await supabase
    .from("categorias_produtos")
    .select("id, ativo")
    .ilike("nome", normalizedName)
    .limit(1)
    .maybeSingle();

  if (readError) throw new Error(`Não foi possível consultar a categoria: ${readError.message}`);

  if (category) {
    if (!category.ativo) {
      const { error: activateError } = await supabase
        .from("categorias_produtos")
        .update({ ativo: true })
        .eq("id", category.id);
      if (activateError) throw new Error(`Não foi possível reativar a categoria: ${activateError.message}`);
    }
    return category.id;
  }

  const categorySlug = slugify(normalizedName);
  if (!categorySlug) throw new Error("Informe um nome de categoria que contenha letras ou números.");

  const { data: created, error: createError } = await supabase
    .from("categorias_produtos")
    .insert({ nome: normalizedName, slug: categorySlug })
    .select("id")
    .single();

  if (createError) {
    if (createError.code === "23505") {
      throw new Error("Já existe uma categoria com esse nome ou endereço. Use a categoria existente.");
    }
    throw new Error(`Não foi possível criar a categoria: ${createError.message}`);
  }

  return created.id;
}

function toDatabasePayload(input: ProductValidated, categoryId: string): TablesInsert<"produtos"> & TablesUpdate<"produtos"> {
  return {
    categoria_id: categoryId, nome: input.name, slug: input.slug,
    descricao_curta: input.short_description, descricao: input.description,
    peso_liquido: input.net_weight, unidade: input.unit,
    preco_venda: input.sale_price, custo_estimado: input.estimated_cost,
    status: input.status.toUpperCase() as "ATIVO" | "INATIVO" | "ESGOTADO", destaque: input.featured,
    publicado: input.published, imagem_principal_path: input.main_image_path,
    ingredientes_publicos: input.public_ingredients, conservacao: input.conservation,
    alergenos: input.allergens, observacoes_rotulagem: input.label_notes,
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
  const categoryId = await getOrCreateCategoryId(payload.category);
  const supabase = createClient();
  const { data, error } = await supabase.from("produtos").insert(toDatabasePayload(payload, categoryId)).select("*, categorias_produtos(nome)").single();
  if (error) throw productFriendlyError(error.message);
  if (payload.stock_quantity > 0) {
    const { error: stockError } = await supabase.rpc("ajustar_estoque", { p_item_tipo: "PRODUTO", p_item_id: data.id, p_novo_saldo: payload.stock_quantity, p_observacoes: "Estoque inicial do cadastro do produto" });
    if (stockError) {
      await supabase.from("produtos").delete().eq("id", data.id);
      throw new Error(`Não foi possível registrar o estoque inicial: ${stockError.message}`);
    }
    data.quantidade_disponivel = payload.stock_quantity;
  }
  return toProduct(data as ProductRow);
}

export async function updateProduct(id: string, input: ProductValidated): Promise<Product> {
  const payload = productSchema.parse(input);
  const categoryId = await getOrCreateCategoryId(payload.category);
  const supabase = createClient();
  const { data: current, error: readError } = await supabase.from("produtos").select("quantidade_disponivel").eq("id", id).single();
  if (readError) throw new Error(readError.message);
  if (Number(current.quantidade_disponivel) !== payload.stock_quantity) {
    const { error: stockError } = await supabase.rpc("ajustar_estoque", { p_item_tipo: "PRODUTO", p_item_id: id, p_novo_saldo: payload.stock_quantity, p_observacoes: "Ajuste realizado no cadastro do produto" });
    if (stockError) throw new Error(stockError.message);
  }
  const { data, error } = await supabase.from("produtos").update(toDatabasePayload(payload, categoryId)).eq("id", id).select("*, categorias_produtos(nome)").single();
  if (error) throw productFriendlyError(error.message);
  return toProduct(data as ProductRow);
}

export async function getProductDeletionStatus(id: string): Promise<ProductDeletionStatus> {
  const supabase = createClient();
  const [recipes, productions, saleItems, stockMovements] = await Promise.all([
    supabase.from("receitas").select("id", { count: "exact", head: true }).eq("produto_id", id),
    supabase.from("producoes").select("id", { count: "exact", head: true }).eq("produto_id", id),
    supabase.from("venda_itens").select("id", { count: "exact", head: true }).eq("produto_id", id),
    supabase.from("movimentacoes_estoque").select("id", { count: "exact", head: true }).eq("produto_id", id),
  ]);

  const failed = [recipes.error, productions.error, saleItems.error, stockMovements.error].find(Boolean);
  if (failed) throw new Error(`Não foi possível verificar os vínculos do produto: ${failed.message}`);

  const references = {
    recipes: recipes.count ?? 0,
    productions: productions.count ?? 0,
    saleItems: saleItems.count ?? 0,
    stockMovements: stockMovements.count ?? 0,
  };

  return {
    canDelete: Object.values(references).every((count) => count === 0),
    references,
  };
}

export async function archiveProduct(id: string): Promise<Product> {
  const { data, error } = await createClient()
    .from("produtos")
    .update({ status: "INATIVO", publicado: false, destaque: false })
    .eq("id", id)
    .select("*, categorias_produtos(nome)")
    .single();

  if (error) throw new Error(`Não foi possível arquivar o produto: ${error.message}`);
  return toProduct(data as ProductRow);
}

export async function deleteProduct(id: string): Promise<{ warning?: string }> {
  const status = await getProductDeletionStatus(id);
  if (!status.canDelete) {
    throw new Error("O produto possui histórico e não pode ser excluído. Inative-o para preservar os registros.");
  }

  const supabase = createClient();
  const { data: images, error: imageReadError } = await supabase
    .from("produto_imagens")
    .select("storage_path")
    .eq("produto_id", id);
  if (imageReadError) throw new Error(`Não foi possível verificar as imagens do produto: ${imageReadError.message}`);

  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível excluir o produto: ${error.message}`);

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from("product-images").remove(paths);
    if (storageError) return { warning: `Produto excluído, mas algumas imagens não puderam ser removidas: ${storageError.message}` };
  }

  return {};
}

export async function uploadProductImages(productId: string, files: File[]) {
  const supabase = createClient();
  const uploaded: string[] = [];
  if (files.length > 2) throw new Error("Cada produto pode ter no máximo 2 imagens.");
  const [{ data: existing, error: existingError }, { data: product, error: productError }] = await Promise.all([
    supabase.from("produto_imagens").select("ordem").eq("produto_id", productId).order("ordem", { ascending: false }),
    supabase.from("produtos").select("imagem_principal_path").eq("id", productId).single(),
  ]);
  if (existingError || productError) throw new Error(existingError?.message ?? productError?.message);
  if ((existing?.length ?? 0) + files.length > 2) throw new Error(`Este produto já possui ${existing?.length ?? 0} imagem(ns). O limite total é 2.`);
  const firstOrder = (existing?.[0]?.ordem ?? -1) + 1;
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(`O arquivo ${file.name} não possui um formato permitido.`);
    if (file.size > 5 * 1024 * 1024) throw new Error(`O arquivo ${file.name} ultrapassa o limite de 5 MB.`);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `${productId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { error: metadataError } = await supabase.from("produto_imagens").insert({ produto_id: productId, storage_path: path, alt_text: file.name, ordem: firstOrder + uploaded.length });
    if (metadataError) throw new Error(metadataError.message);
    uploaded.push(path);
  }
  if (uploaded.length && !product.imagem_principal_path) {
    const { error } = await supabase.from("produtos").update({ imagem_principal_path: uploaded[0] }).eq("id", productId);
    if (error) throw new Error(error.message);
  }
  return uploaded;
}

export type ProductImageAdmin = { id: string; storage_path: string; alt_text: string | null; ordem: number };
export async function listProductImages(productId: string): Promise<ProductImageAdmin[]> { const { data, error } = await createClient().from("produto_imagens").select("id, storage_path, alt_text, ordem").eq("produto_id", productId).order("ordem"); if (error) throw new Error(error.message); return data; }
export async function setMainProductImage(productId: string, path: string | null) { const { error } = await createClient().from("produtos").update({ imagem_principal_path: path }).eq("id", productId); if (error) throw new Error(error.message); }
export async function removeProductImage(productId: string, image: ProductImageAdmin) { const supabase = createClient(); const { data: product, error: readError } = await supabase.from("produtos").select("imagem_principal_path").eq("id", productId).single(); if (readError) throw new Error(readError.message); const { error } = await supabase.from("produto_imagens").delete().eq("id", image.id); if (error) throw new Error(error.message); let nextMain = product.imagem_principal_path; if (nextMain === image.storage_path) { const { data: next } = await supabase.from("produto_imagens").select("storage_path").eq("produto_id", productId).order("ordem").limit(1).maybeSingle(); nextMain = next?.storage_path ?? null; await setMainProductImage(productId, nextMain); } const { error: storageError } = await supabase.storage.from("product-images").remove([image.storage_path]); if (storageError) throw new Error(`Registro removido, mas o arquivo não pôde ser excluído: ${storageError.message}`); return nextMain; }
export async function moveProductImage(productId: string, imageId: string, direction: -1 | 1) { const supabase = createClient(); const images = await listProductImages(productId); const index = images.findIndex(image => image.id === imageId); const target = images[index + direction]; if (index < 0 || !target) return; const temporary = Math.max(...images.map(image => image.ordem)) + 1; const current = images[index]; for (const [id, ordem] of [[current.id, temporary], [target.id, current.ordem], [current.id, target.ordem]] as const) { const { error } = await supabase.from("produto_imagens").update({ ordem }).eq("id", id); if (error) throw new Error(error.message); } }

function productFriendlyError(message: string): Error {
  if (message.includes("produtos_nome_normalizado_unique")) {
    return new Error("Já existe um produto com esse nome. Use outro nome ou edite o produto existente.");
  }
  if (message.includes("produtos_slug_unique")) {
    return new Error("Já existe um produto com esse endereço. Altere o endereço do catálogo.");
  }
  return new Error(message);
}
