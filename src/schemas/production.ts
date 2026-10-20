import { z } from "zod";

const optionalPositive = z.preprocess(
  value => value === "" || value === null || value === undefined ? null : Number(value),
  z.number().positive("Informe um valor maior que zero.").nullable(),
);

const optionalNonNegativeInteger = z.preprocess(
  value => value === "" || value === null || value === undefined ? null : Number(value),
  z.number().int("Use um número inteiro.").min(0, "A quantidade não pode ser negativa.").nullable(),
);

export const productionSchema = z.object({
  recipeId: z.string().uuid("Selecione uma receita."),
  multiplier: z.coerce.number().int("Use um número inteiro.").positive("Informe ao menos uma receita."),
  productionDate: z.string().date("Informe uma data válida."),
  producedQuantity: optionalNonNegativeInteger,
  expirationDate: z.preprocess(value => value === "" ? null : value, z.string().date().nullable()),
  finalWeightG: optionalPositive,
  notes: z.string().trim().max(1500).nullable().default(null),
  yieldDifferenceReason: z.string().trim().max(500).nullable().default(null),
  items: z.array(z.object({
    ingredientId: z.string().uuid(),
    used: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  })).min(1, "A receita precisa ter ingredientes."),
}).superRefine((value, context) => {
  if (value.expirationDate && value.expirationDate < value.productionDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["expirationDate"], message: "A validade não pode ser anterior à produção." });
  }
});

export type ProductionValues = z.input<typeof productionSchema>;
export type ProductionValidated = z.output<typeof productionSchema>;
