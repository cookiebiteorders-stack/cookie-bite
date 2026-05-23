export type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

export type InvoiceApiRow = {
  id: string;
  invoice_number: string;
  amount_egp: number;
  status: InvoiceStatus;
  issued_at: string;
  customer_name: string | null;
  customer_email: string | null;
  order: {
    id: string | null;
    order_code: string | null;
    status: string | null;
    items: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit_price_egp: number;
    }>;
  };
  payment: {
    id: string | null;
    method: string | null;
    transaction_id: string | null;
    status: string | null;
    paid_at: string | null;
  };
  is_manual?: boolean;
  /** من جدول invoices — يمكن تعديلها/حذفها */
  is_editable?: boolean;
  lifecycle_status?: string | null;
  currency?: string;
  due_at?: string | null;
};
