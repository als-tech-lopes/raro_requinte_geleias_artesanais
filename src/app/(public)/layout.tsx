import { CartProvider } from "@/components/catalog/cart-context";
import { PublicShell } from "@/components/catalog/public-shell";
import { getCurrentAdmin } from "@/services/auth";
import { defaultCatalogSettings, getCatalogSettings } from "@/services/catalog";

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const [settings, admin] = await Promise.all([
    getCatalogSettings().catch(() => defaultCatalogSettings),
    getCurrentAdmin().catch(() => null),
  ]);

  return (
    <CartProvider>
      <PublicShell settings={settings} adminName={admin?.profile.nome}>
        {children}
      </PublicShell>
    </CartProvider>
  );
}
