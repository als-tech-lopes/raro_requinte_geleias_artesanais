export const productStatuses = ["ativo", "inativo", "esgotado"] as const;
export type ProductStatus = (typeof productStatuses)[number];
export type ProductUnit = "kg" | "g" | "L" | "ml" | "unidade";

export type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string | null;
  category: string;
  net_weight: number;
  unit: ProductUnit;
  sale_price: number;
  estimated_cost: number;
  stock_quantity: number;
  status: ProductStatus;
  featured: boolean;
  published: boolean;
  main_image_path: string | null;
  public_ingredients: string | null;
  conservation: string | null;
  allergens: string | null;
  label_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductInput = Omit<Product, "id" | "created_at" | "updated_at">;

export type ProductDeletionStatus = {
  canDelete: boolean;
  references: {
    recipes: number;
    productions: number;
    saleItems: number;
    stockMovements: number;
  };
};
