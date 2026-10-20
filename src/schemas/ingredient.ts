import { z } from "zod";

const nonNegativeNumber = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser um número.` }).nonnegative(`${label} não pode ser negativo.`);
const positiveNumber = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser um número.` }).positive(`${label} deve ser maior que zero.`);
export const measurementUnits = ["kg", "g", "L", "ml", "unidade"] as const;

export const ingredientSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres.").max(120).transform(value => value.replace(/\s+/g, " ")),
  categoryId: z.string().uuid("Selecione uma categoria."),
  unit: z.enum(measurementUnits),
  minimumStock: nonNegativeNumber("Estoque mínimo"),
  initialQuantity: nonNegativeNumber("Quantidade inicial"),
  initialTotalValue: nonNegativeNumber("Valor inicial"),
  notes: z.string().trim().max(1000).nullable().default(null),
  active: z.boolean().default(true),
}).superRefine((value, context) => {
  if (value.initialQuantity === 0 && value.initialTotalValue > 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["initialQuantity"], message: "Informe a quantidade correspondente ao valor pago." });
  if (value.initialQuantity > 0 && value.initialTotalValue <= 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["initialTotalValue"], message: "Informe o valor total pago pelo estoque inicial." });
  if (value.unit === "unidade" && (!Number.isInteger(value.initialQuantity) || !Number.isInteger(value.minimumStock))) context.addIssue({ code: z.ZodIssueCode.custom, path: ["initialQuantity"], message: "Use números inteiros para itens controlados por unidade." });
});

export const purchaseSchema = z.object({
  quantity: positiveNumber("Quantidade"),
  unit: z.enum(measurementUnits),
  totalValue: positiveNumber("Valor total"),
  purchaseDate: z.string().date("Informe uma data válida."),
  notes: z.string().trim().max(1000).nullable().default(null),
});

export const adjustmentSchema = z.object({
  newBalance: nonNegativeNumber("Novo saldo"),
  reason: z.string().trim().min(2, "Selecione ou informe o motivo.").max(120),
  notes: z.string().trim().max(1000).nullable().default(null),
});

export type IngredientValues = z.input<typeof ingredientSchema>;
export type IngredientValidated = z.output<typeof ingredientSchema>;
export type PurchaseValues = z.input<typeof purchaseSchema>;
export type PurchaseValidated = z.output<typeof purchaseSchema>;
export type AdjustmentValues = z.input<typeof adjustmentSchema>;
export type AdjustmentValidated = z.output<typeof adjustmentSchema>;
