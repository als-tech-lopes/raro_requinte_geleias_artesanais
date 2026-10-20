import type { Database } from "@/types/database";

export type MeasurementUnit = Database["public"]["Enums"]["unidade_medida"];

export type IngredientCategory = {
  id: string;
  name: string;
  slug: string;
};

export type Ingredient = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unit: MeasurementUnit;
  averageCost: number;
  quantity: number;
  minimumStock: number;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IngredientMovement = {
  id: string;
  date: string;
  type: Database["public"]["Enums"]["movimentacao_tipo"];
  origin: Database["public"]["Enums"]["movimentacao_origem"];
  quantity: number;
  balanceAfter: number;
  unit: MeasurementUnit;
  unitCost: number;
  totalValue: number;
  notes: string | null;
};
