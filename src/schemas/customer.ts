import { z } from "zod";
import { CUSTOMER_SOURCES } from "@/types/customer";

const optionalText = (limit: number) => z.string().trim().max(limit).transform(value => value || null);

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente.").max(120, "Use no máximo 120 caracteres."),
  phone: z.string().trim()
    .min(1, "Informe o telefone do cliente.")
    .refine(value => {
      const digits = value.replace(/\D/g, "");
      return digits.length === 10 || digits.length === 11;
    }, "Informe um telefone com DDD."),
  socialNetwork: optionalText(120),
  source: z.enum(CUSTOMER_SOURCES, { message: "Selecione como o cliente chegou até nós." }),
  notes: optionalText(500),
});

export type CustomerFormValues = z.input<typeof customerSchema>;
export type CustomerValidated = z.output<typeof customerSchema>;
