import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { productSchema, type ProductValidated } from "./schema";
import type { Product } from "./types";

export const isDemoMode = () => !hasSupabaseConfig();

export function getProductImageUrl(path: string | null) {
  if (!path || isDemoMode()) return null;
  return createClient().storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export async function listProducts(): Promise<Product[]> {
  if (isDemoMode()) return [];
  const { data, error } = await createClient().from("products").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function createProduct(input: ProductValidated): Promise<Product> {
  const { data, error } = await createClient().from("products").insert(productSchema.parse(input)).select("*").single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function updateProduct(id: string, input: ProductValidated): Promise<Product> {
  const { data, error } = await createClient().from("products").update(productSchema.parse(input)).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function deleteProduct(id: string) {
  const { error } = await createClient().from("products").delete().eq("id", id);
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
    const { error: metadataError } = await supabase.from("product_images").insert({ product_id: productId, storage_path: path, alt_text: file.name, sort_order: uploaded.length });
    if (metadataError) throw new Error(metadataError.message);
    uploaded.push(path);
  }
  if (uploaded.length) {
    const { error } = await supabase.from("products").update({ main_image_path: uploaded[0] }).eq("id", productId);
    if (error) throw new Error(error.message);
  }
  return uploaded;
}
