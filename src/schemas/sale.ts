import { z } from "zod";

export const saleSchema = z.object({
  customerId: z.preprocess(value => value === "" ? null : value, z.string().uuid().nullable()),
  paymentMethod: z.enum(["PIX", "DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "TRANSFERENCIA"]),
  status: z.enum(["PAGA", "PENDENTE"]),
  discount: z.coerce.number().min(0, "O desconto não pode ser negativo."),
  deliveryFee: z.coerce.number().min(0, "A entrega não pode ser negativa."),
  notes: z.string().trim().max(1000).nullable().default(null),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.coerce.number().int().positive() })).min(1, "Adicione ao menos um produto."),
}).superRefine((value, context) => {
  if (new Set(value.items.map(item => item.productId)).size !== value.items.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Não repita produtos." });
});
export type SaleValues = z.input<typeof saleSchema>;
export type SaleValidated = z.output<typeof saleSchema>;

export const quickCustomerSchema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().min(8).max(30) });
export type QuickCustomerValues = z.infer<typeof quickCustomerSchema>;
