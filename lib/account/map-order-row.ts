import type { AccountOrderRow } from "@/components/account/account-orders-list";
import type { OrderRow } from "@/lib/db/types";

export function mapOrderRowToAccountOrder(o: OrderRow): AccountOrderRow {
  return {
    id: o.id,
    order_number: o.order_number,
    order_code: o.order_code,
    total_egp: o.total_egp,
    payment_status: o.payment_status,
    status: o.status,
    order_type: o.order_type,
    gift_box_snapshot: o.gift_box_snapshot,
    reveal_token: o.reveal_token ?? null,
    created_at: o.created_at,
  };
}
