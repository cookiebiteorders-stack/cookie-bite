import type { OrderNotificationContext } from "@/lib/notifications/types";
import { notifyStoreOrderEvent } from "@/lib/notifications/store-order-events";

/**
 * Notifies store inbox + owner/admin when a new order is placed.
 * @deprecated Prefer notifyStoreOrderEvent({ event: "created" }) — kept for orchestrator import.
 */
export async function tryNotifyStaffNewOrder(
  _ctx: OrderNotificationContext,
  orderId: string,
): Promise<void> {
  await notifyStoreOrderEvent({ orderId, event: "created" });
}
