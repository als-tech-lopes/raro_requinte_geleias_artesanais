import { createClient } from "@/lib/supabase/client";
import type { CatalogSettings } from "@/types/catalog";
import type { Database, Json } from "@/types/database";

const keys: Record<keyof CatalogSettings, string> = {
  businessName: "catalogo.nome_comercial", shortDescription: "catalogo.descricao_curta", mainMessage: "catalogo.mensagem_principal", story: "catalogo.historia",
  whatsapp: "catalogo.whatsapp", instagram: "catalogo.instagram", city: "catalogo.cidade", state: "catalogo.estado", serviceInfo: "catalogo.atendimento",
  primaryColor: "catalogo.cor_primaria", secondaryColor: "catalogo.cor_secundaria", logoPath: "catalogo.logo_path", bannerPath: "catalogo.banner_path",
  institutionalImagePath: "catalogo.imagem_institucional_path", showSoldOut: "catalogo.exibir_esgotados", showPrices: "catalogo.exibir_precos",
  whatsappEnabled: "catalogo.whatsapp_ativo", showTestimonials: "catalogo.exibir_depoimentos", showGallery: "catalogo.exibir_galeria",
};

export async function saveCatalogSettings(settings: CatalogSettings) {
  const rows = (Object.entries(keys) as Array<[keyof CatalogSettings, string]>).map(([field, chave]) => ({ chave, valor: settings[field] as Json, publica: true }));
  const { error } = await createClient().from("configuracoes").upsert(rows, { onConflict: "chave" });
  if (error) throw new Error(error.message);
}

export async function uploadPublicImage(file: File, scope: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
  if (file.size > 10 * 1024 * 1024) throw new Error("A imagem ultrapassa o limite de 10 MB.");
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-"); const path = `${scope}/${crypto.randomUUID()}-${safe}`;
  const { error } = await createClient().storage.from("public-media").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message); return path;
}

export type AdminTestimonial = Database["public"]["Tables"]["depoimentos"]["Row"];
export async function listAdminTestimonials() { const { data, error } = await createClient().from("depoimentos").select("*").order("data_depoimento", { ascending: false }); if (error) throw new Error(error.message); return data; }
export async function saveAdminTestimonial(input: Partial<AdminTestimonial> & Pick<AdminTestimonial, "nome_publico" | "comentario" | "nota">) { const payload = { nome_publico: input.nome_publico, comentario: input.comentario, nota: input.nota, foto_path: input.foto_path ?? null, aprovado: input.aprovado ?? false, autorizado_publicacao: input.autorizado_publicacao ?? false, destaque: input.destaque ?? false, data_depoimento: input.data_depoimento }; const query = input.id ? createClient().from("depoimentos").update(payload).eq("id", input.id) : createClient().from("depoimentos").insert(payload); const { error } = await query; if (error) throw new Error(error.message); }
export async function deleteAdminTestimonial(id: string) { const { error } = await createClient().from("depoimentos").delete().eq("id", id); if (error) throw new Error(error.message); }

export type AdminMedia = Database["public"]["Tables"]["midias"]["Row"];
export async function listAdminMedia() { const { data, error } = await createClient().from("midias").select("*").order("ordem"); if (error) throw new Error(error.message); return data; }
export async function createAdminMedia(input: { tipo: AdminMedia["tipo"]; titulo: string; alt_text: string | null; publico: boolean; ordem: number; file: File }) { const path = await uploadPublicImage(input.file, "galeria"); const { error } = await createClient().from("midias").insert({ tipo: input.tipo, titulo: input.titulo, alt_text: input.alt_text, publico: input.publico, ordem: input.ordem, storage_path: path }); if (error) { await createClient().storage.from("public-media").remove([path]); throw new Error(error.message); } }
export async function updateAdminMedia(id: string, input: { titulo?: string; alt_text?: string | null; publico?: boolean; ordem?: number }) { const { error } = await createClient().from("midias").update(input).eq("id", id); if (error) throw new Error(error.message); }
export async function deleteAdminMedia(item: AdminMedia) { const { error } = await createClient().from("midias").delete().eq("id", item.id); if (error) throw new Error(error.message); const { error: storageError } = await createClient().storage.from("public-media").remove([item.storage_path]); if (storageError) throw new Error(`Registro removido, mas o arquivo não pôde ser excluído: ${storageError.message}`); }
