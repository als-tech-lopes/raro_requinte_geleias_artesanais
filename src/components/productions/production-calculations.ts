import { convertQuantity } from "@/components/recipes/recipe-calculations";
import type { ProductionRecipe } from "@/types/production";

export function plannedRecipeItems(recipe: ProductionRecipe, multiplier: number) {
  return recipe.items.map(item => ({
    ...item,
    planned: (convertQuantity(item.recipeQuantity, item.recipeUnit, item.stockUnit) ?? 0) * multiplier,
  }));
}

export function estimateProduction(recipe: ProductionRecipe, multiplier: number, used?: Array<{ ingredientId: string; used: number }>) {
  const items = plannedRecipeItems(recipe, multiplier).map(item => ({
    ...item,
    used: used?.find(candidate => candidate.ingredientId === item.ingredientId)?.used ?? item.planned,
  }));
  const ingredientCost = items.filter(item => item.costType === "INGREDIENTE").reduce((sum, item) => sum + item.used * item.averageCost, 0);
  const packagingCost = items.filter(item => item.costType === "EMBALAGEM").reduce((sum, item) => sum + item.used * item.averageCost, 0);
  return {
    expectedJars: recipe.expectedJars * multiplier,
    expectedWeightG: recipe.expectedYieldG * multiplier,
    ingredientCost,
    packagingCost,
    totalCost: ingredientCost + packagingCost,
    items,
  };
}
