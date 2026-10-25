import type { MetadataRoute } from "next";
import { getCatalogProducts } from "@/services/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const products = await getCatalogProducts().catch(() => []);
  const routes = ["", "/catalogo", "/galeria", "/sobre", "/depoimentos", "/contato"];
  return [...routes.map(path => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "weekly" as const : "monthly" as const, priority: path === "" ? 1 : .7 })), ...products.map(product => ({ url: `${base}/catalogo/${product.slug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: .8 }))];
}
