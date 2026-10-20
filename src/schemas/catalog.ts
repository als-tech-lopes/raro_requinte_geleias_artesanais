import { z } from "zod";

export const catalogSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120), shortDescription: z.string().trim().min(10).max(500), mainMessage: z.string().trim().min(10).max(500), story: z.string().trim().min(20).max(5000),
  whatsapp: z.string().trim().max(30), instagram: z.string().trim().max(100), city: z.string().trim().max(100), state: z.string().trim().max(2), serviceInfo: z.string().trim().max(500),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), logoPath: z.string(), bannerPath: z.string(), institutionalImagePath: z.string(),
  showSoldOut: z.boolean(), showPrices: z.boolean(), whatsappEnabled: z.boolean(), showTestimonials: z.boolean(), showGallery: z.boolean(),
});
export type CatalogSettingsValues = z.infer<typeof catalogSettingsSchema>;

export const testimonialSchema = z.object({ nome_publico: z.string().trim().min(2).max(80), comentario: z.string().trim().min(10).max(1000), nota: z.coerce.number().int().min(1).max(5), data_depoimento: z.string(), aprovado: z.boolean(), autorizado_publicacao: z.boolean(), destaque: z.boolean() });
export type TestimonialValues = z.infer<typeof testimonialSchema>;
