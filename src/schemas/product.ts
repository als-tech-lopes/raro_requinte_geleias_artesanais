import { z } from "zod";

const numberField = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} deve ser um número.` });

export const productSchema = z.object({
  name: z.string().trim().min(3, "Informe ao menos 3 caracteres.").max(120).transform(value => value.replace(/\s+/g, " ")),
  slug: z.string().trim().min(3, "Informe o endereço do produto.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens."),
  short_description: z.string().trim().min(10, "Descreva o produto em ao menos 10 caracteres.").max(180),
  description: z.string().trim().max(3000).nullable().default(null),
  category: z.string().trim().min(2, "Informe a categoria.").max(80),
  net_weight: numberField("Peso").positive("O peso deve ser maior que zero."),
  unit: z.enum(["kg", "g", "L", "ml", "unidade"]),
  sale_price: numberField("Preço").nonnegative("O preço não pode ser negativo."),
  estimated_cost: numberField("Custo").nonnegative("O custo não pode ser negativo."),
  stock_quantity: numberField("Estoque").int("Use uma quantidade inteira.").nonnegative("O estoque não pode ser negativo."),
  status: z.enum(["ativo", "inativo", "esgotado"]),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  main_image_path: z.string().trim().nullable().default(null),
  public_ingredients: z.string().trim().max(2000).nullable().default(null),
  conservation: z.string().trim().max(1000).nullable().default(null),
  allergens: z.string().trim().max(1000).nullable().default(null),
  label_notes: z.string().trim().max(1000).nullable().default(null),
}).superRefine((value, context) => {
  if (value.status === "esgotado" && value.stock_quantity !== 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["stock_quantity"], message: "Produto esgotado deve ter estoque zero." });
  }
});

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductValidated = z.output<typeof productSchema>;

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
