import type { MeasurementUnit } from "@/types/ingredient";

export type ProductionStatus = "RASCUNHO" | "CONFIRMADA" | "CANCELADA";

export type ProductionRecipeItem = {
  ingredientId: string;
  ingredientName: string;
  recipeQuantity: number;
  recipeUnit: MeasurementUnit;
  stockUnit: MeasurementUnit;
  stockQuantity: number;
  averageCost: number;
  costType: "INGREDIENTE" | "EMBALAGEM";
};

export type ProductionRecipe = {
  id: string;
  name: string;
  productId: string;
  productName: string;
  productWeightG: number;
  expectedYieldG: number;
  expectedJars: number;
  jarWeightG: number;
  items: ProductionRecipeItem[];
};

export type ProductionItem = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  planned: number;
  used: number;
  unit: MeasurementUnit;
  unitCost: number;
  totalCost: number;
  costType: "INGREDIENTE" | "EMBALAGEM";
  currentStock: number;
};

export type ProductionMovement = {
  id: string;
  itemType: "INGREDIENTE" | "PRODUTO";
  itemName: string;
  quantity: number;
  unit: MeasurementUnit;
  date: string;
};

export type ProductBatch = {
  id: string;
  code: string;
  productionDate: string;
  expirationDate: string;
  initialQuantity: number;
  availableQuantity: number;
};

export type Production = {
  id: string;
  recipeId: string;
  recipeName: string;
  productId: string;
  productName: string;
  productionDate: string;
  multiplier: number;
  plannedQuantity: number;
  producedQuantity: number | null;
  batchCode: string | null;
  expirationDate: string | null;
  status: ProductionStatus;
  finalWeightG: number | null;
  yieldDifferenceReason: string | null;
  ingredientCost: number;
  packagingCost: number;
  directCost: number;
  costPerJar: number | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  jarWeightG: number;
  items: ProductionItem[];
  movements: ProductionMovement[];
  batch: ProductBatch | null;
};

export type ProductionSaveInput = {
  recipeId: string;
  multiplier: number;
  productionDate: string;
  producedQuantity: number | null;
  expirationDate: string | null;
  finalWeightG: number | null;
  notes: string | null;
  yieldDifferenceReason: string | null;
  items: Array<{ ingredientId: string; used: number }>;
};

export type CompletionResult = { production_id: string; lote: string; quantidade_produzida: number };
