import type { MeasurementUnit } from "@/types/ingredient";

export type RecipeCatalogIngredient = {
  id: string;
  name: string;
  unit: MeasurementUnit;
  averageCost: number;
  active: boolean;
};

export type RecipeProduct = { id: string; name: string };

export type RecipeItem = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: MeasurementUnit;
  stockUnit: MeasurementUnit;
  averageCost: number;
};

export type Recipe = {
  id: string;
  name: string;
  productId: string | null;
  productName: string | null;
  description: string | null;
  preparation: string | null;
  expectedYieldG: number;
  jarWeightG: number;
  expectedJars: number;
  notes: string | null;
  active: boolean;
  version: number;
  originId: string | null;
  createdAt: string;
  updatedAt: string;
  items: RecipeItem[];
};
