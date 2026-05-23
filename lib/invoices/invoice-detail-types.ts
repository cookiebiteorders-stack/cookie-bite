export type InvoiceDetailStatus = "paid" | "pending" | "failed" | "refunded";

export type InvoiceItemPayload = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_egp: number;
  total_price_egp: number | null;
};

export type InvoiceDetailPayload = {
  id: string;
  invoice_number: string;
  amount_egp: number;
  status: InvoiceDetailStatus;
  issued_at: string;
  customer_name: string | null;
  customer_email: string | null;
  order: {
    id: string | null;
    order_code: string | null;
    status: string | null;
    items: InvoiceItemPayload[];
    subtotal_egp: number | null;
    discount_amount_egp: number | null;
    delivery_fee_egp: number | null;
    notes: string | null;
    shipping_address: Record<string, unknown> | null;
  };
  payment: {
    id: string | null;
    method: string | null;
    transaction_id: string | null;
    status: string | null;
    paid_at: string | null;
  };
};
