import type { ProductUnit } from "@/types/product";

export type CatalogSettings = {
  businessName: string;
  shortDescription: string;
  mainMessage: string;
  story: string;
  whatsapp: string;
  instagram: string;
  city: string;
  state: string;
  serviceInfo: string;
  primaryColor: string;
  secondaryColor: string;
  logoPath: string;
  bannerPath: string;
  institutionalImagePath: string;
  showSoldOut: boolean;
  showPrices: boolean;
  whatsappEnabled: boolean;
  showTestimonials: boolean;
  showGallery: boolean;
};

export type CatalogProduct = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  netWeight: number;
  unit: ProductUnit;
  price: number;
  featured: boolean;
  imagePath: string | null;
  imageUrl: string | null;
  available: boolean;
  publicIngredients: string | null;
  conservation: string | null;
  allergens: string | null;
  labelNotes: string | null;
  variations: CatalogVariation[];
};

export type CatalogVariation = { id: string; netWeight: number; unit: ProductUnit; price: number };

export type CatalogImage = { id: string; productId: string; path: string; url: string; alt: string; order: number };
export type CatalogTestimonial = { id: string; publicName: string; comment: string; rating: number; photoUrl: string | null; featured: boolean; date: string };
export type CatalogMedia = { id: string; type: "BANNER" | "PRODUCAO" | "INSTITUCIONAL" | "DIVULGACAO"; title: string; url: string; alt: string; order: number };
export type CartEntry = { productId: string; variationId?: string; quantity: number };
export type ValidatedCartItem = { productId: string; variationId: string; name: string | null; slug: string | null; netWeight: number | null; unit: ProductUnit | null; price: number | null; imageUrl: string | null; quantity: number; valid: boolean; reason: string | null };
