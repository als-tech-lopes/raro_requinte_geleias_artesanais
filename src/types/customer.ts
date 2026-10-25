export const CUSTOMER_SOURCES = [
  "INDICACAO",
  "INSTAGRAM",
  "WHATSAPP",
  "FEIRA_EVENTO",
  "CATALOGO_SITE",
  "OUTRO",
] as const;

export type CustomerSource = (typeof CUSTOMER_SOURCES)[number];

export type Customer = {
  id: string;
  name: string;
  phone: string;
  socialNetwork: string | null;
  source: CustomerSource | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
};
