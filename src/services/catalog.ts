import { createPublicClient } from "@/lib/supabase/public";
import type { CartEntry, CatalogImage, CatalogMedia, CatalogProduct, CatalogSettings, CatalogTestimonial, ValidatedCartItem } from "@/types/catalog";
import type { ProductUnit } from "@/types/product";

export const defaultCatalogSettings: CatalogSettings = {
  businessName: "RR Geleias Artesanais",
  shortDescription: "Sabores artesanais feitos com carinho, frutas selecionadas e receitas especiais.",
  mainMessage: "Geleias artesanais para transformar pequenos momentos em lembranças deliciosas.",
  story: "Produzimos geleias artesanais em pequenos lotes, respeitando o tempo de cada receita e o sabor das frutas.",
  whatsapp: "", instagram: "", city: "", state: "", serviceInfo: "Atendimento e entregas combinados pelo WhatsApp.",
  primaryColor: "#315c3e", secondaryColor: "#9c2348", logoPath: "", bannerPath: "", institutionalImagePath: "",
  showSoldOut: true, showPrices: true, whatsappEnabled: true, showTestimonials: true, showGallery: true,
};

const settingMap: Record<string, keyof CatalogSettings> = {
  "catalogo.nome_comercial": "businessName", "catalogo.descricao_curta": "shortDescription", "catalogo.mensagem_principal": "mainMessage",
  "catalogo.historia": "story", "catalogo.whatsapp": "whatsapp", "catalogo.instagram": "instagram", "catalogo.cidade": "city",
  "catalogo.estado": "state", "catalogo.atendimento": "serviceInfo", "catalogo.cor_primaria": "primaryColor", "catalogo.cor_secundaria": "secondaryColor",
  "catalogo.logo_path": "logoPath", "catalogo.banner_path": "bannerPath", "catalogo.imagem_institucional_path": "institutionalImagePath",
  "catalogo.exibir_esgotados": "showSoldOut", "catalogo.exibir_precos": "showPrices", "catalogo.whatsapp_ativo": "whatsappEnabled",
  "catalogo.exibir_depoimentos": "showTestimonials", "catalogo.exibir_galeria": "showGallery",
};

export function publicAssetUrl(bucket: "product-images" | "public-media", path: string | null | undefined) {
  if (!path) return null;
  return createPublicClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function getCatalogSettings(): Promise<CatalogSettings> {
  const { data, error } = await createPublicClient().from("catalogo_configuracoes").select("chave, valor").like("chave", "catalogo.%");
  if (error) throw new Error(`Não foi possível carregar as configurações públicas: ${error.message}`);
  const settings = { ...defaultCatalogSettings } as Record<string, string | boolean>;
  for (const row of data ?? []) { const key = row.chave ? settingMap[row.chave] : undefined; if (key && (typeof row.valor === "string" || typeof row.valor === "boolean")) settings[key] = row.valor; }
  return settings as unknown as CatalogSettings;
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const { data, error } = await createPublicClient().from("catalogo_produtos").select("*").order("nome");
  if (error) throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);
  return (data ?? []).flatMap(row => row.id && row.nome && row.slug && row.categoria_id && row.categoria_nome && row.categoria_slug && row.unidade ? [{
    id: row.id, categoryId: row.categoria_id, categoryName: row.categoria_nome, categorySlug: row.categoria_slug, name: row.nome, slug: row.slug,
    shortDescription: row.descricao_curta ?? "", description: row.descricao, netWeight: Number(row.peso_liquido), unit: row.unidade as ProductUnit,
    price: Number(row.preco_venda), featured: Boolean(row.destaque), imagePath: row.imagem_principal_path,
    imageUrl: publicAssetUrl("product-images", row.imagem_principal_path), available: Boolean(row.disponivel), publicIngredients: row.ingredientes_publicos,
    conservation: row.conservacao, allergens: row.alergenos, labelNotes: row.observacoes_rotulagem,
  }] : []);
}

export async function getCatalogProduct(slug: string) { return (await getCatalogProducts()).find(product => product.slug === slug) ?? null; }

export async function getCatalogImages(productId: string): Promise<CatalogImage[]> {
  const { data, error } = await createPublicClient().from("catalogo_produto_imagens").select("id, produto_id, storage_path, alt_text, ordem").eq("produto_id", productId).order("ordem");
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap(row => row.id && row.produto_id && row.storage_path ? [{ id: row.id, productId: row.produto_id, path: row.storage_path, url: publicAssetUrl("product-images", row.storage_path)!, alt: row.alt_text ?? "Imagem do produto", order: row.ordem ?? 0 }] : []);
}

export async function getCatalogTestimonials(): Promise<CatalogTestimonial[]> {
  const { data, error } = await createPublicClient().from("catalogo_depoimentos").select("*").order("destaque", { ascending: false }).order("data_depoimento", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap(row => row.id && row.nome_publico && row.comentario && row.nota && row.data_depoimento ? [{ id: row.id, publicName: row.nome_publico, comment: row.comentario, rating: row.nota, photoUrl: publicAssetUrl("public-media", row.foto_path), featured: Boolean(row.destaque), date: row.data_depoimento }] : []);
}

export async function getCatalogMedia(): Promise<CatalogMedia[]> {
  const { data, error } = await createPublicClient().from("catalogo_midias").select("*").order("ordem");
  if (error) throw new Error(error.message);
  return (data ?? []).flatMap(row => row.id && row.tipo && row.titulo && row.storage_path ? [{ id: row.id, type: row.tipo, title: row.titulo, url: publicAssetUrl("public-media", row.storage_path)!, alt: row.alt_text ?? row.titulo, order: row.ordem ?? 0 }] : []);
}

export async function validateCart(entries: CartEntry[]): Promise<ValidatedCartItem[]> {
  if (!entries.length) return [];
  const { data, error } = await createPublicClient().rpc("catalogo_validar_sacola", { p_itens: entries.map(entry => ({ produto_id: entry.productId, quantidade: entry.quantity })) });
  if (error) throw new Error(`Não foi possível atualizar a sacola: ${error.message}`);
  return (data ?? []).map(row => ({ productId: row.produto_id, name: row.nome, slug: row.slug, netWeight: row.peso_liquido === null ? null : Number(row.peso_liquido), unit: row.unidade as ProductUnit | null, price: row.preco_venda === null ? null : Number(row.preco_venda), imageUrl: publicAssetUrl("product-images", row.imagem_principal_path), quantity: row.quantidade_solicitada, valid: row.valido, reason: row.motivo }));
}

export function normalizeWhatsapp(value: string) { const digits = value.replace(/\D/g, ""); if (/^55\d{10,11}$/.test(digits)) return digits; if (/^\d{10,11}$/.test(digits)) return `55${digits}`; return ""; }
