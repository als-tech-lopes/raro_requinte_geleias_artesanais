import { z } from "zod";
import { measurementUnits } from "@/schemas/ingredient";

const positive = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser um número.` }).positive(`${label} deve ser maior que zero.`);

export const recipeSchema = z.object({
  name: z.string().trim().min(3, "Informe ao menos 3 caracteres.").max(120).transform(value => value.replace(/\s+/g, " ")),
  productId: z.string().uuid().nullable().default(null),
  description: z.string().trim().max(1000).nullable().default(null),
  preparation: z.string().trim().max(5000).nullable().default(null),
  expectedYieldG: positive("Rendimento"),
  jarWeightG: positive("Peso por pote"),
  notes: z.string().trim().max(1000).nullable().default(null),
  active: z.boolean().default(true),
  items: z.array(z.object({
    ingredientId: z.string().uuid("Selecione um ingrediente."),
    quantity: positive("Quantidade"),
    unit: z.enum(measurementUnits),
  })).min(1, "Adicione pelo menos um ingrediente."),
}).superRefine((value, context) => {
  if (Math.floor(value.expectedYieldG / value.jarWeightG) < 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["expectedYieldG"], message: "O rendimento deve completar pelo menos um pote." });
  }
  const used = new Set<string>();
  value.items.forEach((item, index) => {
    if (used.has(item.ingredientId)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "ingredientId"], message: "Este ingrediente já foi adicionado." });
    used.add(item.ingredientId);
    if (item.unit === "unidade" && !Number.isInteger(item.quantity)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index, "quantity"], message: "Use um número inteiro para unidades." });
  });
});

export type RecipeValues = z.input<typeof recipeSchema>;
export type RecipeValidated = z.output<typeof recipeSchema>;
