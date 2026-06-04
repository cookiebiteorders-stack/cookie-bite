import { syncOrderFinancialRecords } from "@/lib/orders/sync-order-financials";

export type EnsuredInvoice = {
  id: string;
  invoiceNumber: string;
  amountEgp: number;
  status: string;
  issuedAt: string;
  created: boolean;
};

/**
 * Ensures a paid invoice row exists for an order (idempotent) + payment link.
 */
export async function ensurePaidInvoiceForOrder(
  orderId: string,
  _amountEgp?: number,
): Promise<EnsuredInvoice | null> {
  const { invoice } = await syncOrderFinancialRecords(orderId);
  return invoice;
}
