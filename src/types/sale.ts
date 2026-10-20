import type { Database } from "@/types/database";

export type PaymentMethod = Database["public"]["Enums"]["forma_pagamento"];
export type SaleStatus = Database["public"]["Enums"]["venda_status"];

export type SaleCustomer = { id: string; name: string; phone: string | null; whatsapp: string | null };
export type SaleProduct = { id: string; name: string; weight: number; unit: string; price: number; eligibleStock: number; consolidatedStock: number; imagePath: string | null };
export type SaleItem = { id: string; productId: string; productName: string; quantity: number; unitPrice: number; discount: number; subtotal: number; lots: Array<{ code: string; expirationDate: string; quantity: number }> };
export type SalePayment = { id: string; value: number; method: PaymentMethod; receivedAt: string };
export type SaleRefund = { id: string; value: number; status: "PENDENTE" | "REALIZADO"; reason: string; createdAt: string; realizedAt: string | null };
export type Sale = {
  id: string; number: string; date: string; customerId: string | null; customerName: string | null; customerPhone: string | null;
  subtotal: number; discount: number; deliveryFee: number; total: number; paymentMethod: PaymentMethod; status: SaleStatus;
  notes: string | null; delivered: boolean; canceledAt: string | null; createdByName: string; items: SaleItem[]; payment: SalePayment | null; refund: SaleRefund | null;
};
export type SaleInput = { idempotencyKey: string; customerId: string | null; paymentMethod: PaymentMethod; status: "PAGA" | "PENDENTE"; discount: number; deliveryFee: number; notes: string | null; items: Array<{ productId: string; quantity: number }> };
export type SaleResult = { venda_id: string; numero: string; valor_total: number; status: SaleStatus; duplicada: boolean };
