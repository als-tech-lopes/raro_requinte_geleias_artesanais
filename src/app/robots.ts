import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/dashboard", "/produtos", "/ingredientes", "/receitas", "/producao", "/clientes", "/vendas", "/midias", "/configuracoes", "/login", "/sacola"] }, sitemap: `${base}/sitemap.xml`, host: base };
}
