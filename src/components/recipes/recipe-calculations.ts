import type { MeasurementUnit } from "@/types/ingredient";
import type { Recipe, RecipeCatalogIngredient } from "@/types/recipe";

export function convertQuantity(value: number, from?: MeasurementUnit, to?: MeasurementUnit): number | null {
  if (!from || !to) return null;
  if (from === to) return value;
  if (from === "kg" && to === "g") return value * 1000;
  if (from === "g" && to === "kg") return value / 1000;
  if (from === "L" && to === "ml") return value * 1000;
  if (from === "ml" && to === "L") return value / 1000;
  return null;
}

export function itemCost(value: number, unit: MeasurementUnit | undefined, ingredient?: RecipeCatalogIngredient) {
  if (!ingredient || !unit || value <= 0) return 0;
  const converted = convertQuantity(value, unit, ingredient.unit);
  return converted === null ? 0 : converted * ingredient.averageCost;
}

export function recipeCosts(recipe: Recipe) {
  const total = recipe.items.reduce((sum, item) => sum + itemCost(item.quantity, item.unit, { id: item.ingredientId, name: item.ingredientName, unit: item.stockUnit, averageCost: item.averageCost, active: true }), 0);
  return { total, perJar: recipe.expectedJars ? total / recipe.expectedJars : 0, per100g: recipe.expectedYieldG ? total / recipe.expectedYieldG * 100 : 0 };
}

export function unitShort(unit?: MeasurementUnit) { return unit === "unidade" ? "un" : unit ?? ""; }
