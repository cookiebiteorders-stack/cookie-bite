import { triggerEmailAutomationEvent } from "@/lib/email/automation/event-trigger";

export async function onUserRegistered(params: {
  email: string;
  userId?: string | null;
  userName?: string;
}) {
  return triggerEmailAutomationEvent({
    eventName: "user_registered",
    to: params.email,
    userId: params.userId ?? null,
    providedData: {
      user_name: params.userName ?? "",
    },
    userData: {
      user_name: params.userName ?? "",
    },
  });
}

export async function onOrderCreated(params: {
  email: string;
  userId?: string | null;
  userName?: string;
  orderId: string;
  orderItems: string;
  totalPrice: string | number;
}) {
  return triggerEmailAutomationEvent({
    eventName: "order_created",
    to: params.email,
    userId: params.userId ?? null,
    providedData: {
      user_name: params.userName ?? "",
      order_id: params.orderId,
      order_items: params.orderItems,
      total_price: params.totalPrice,
    },
    userData: {
      user_name: params.userName ?? "",
    },
  });
}

export async function onOrderShipped(params: {
  email: string;
  userId?: string | null;
  userName?: string;
  orderId: string;
  trackingCode?: string;
}) {
  return triggerEmailAutomationEvent({
    eventName: "order_shipped",
    to: params.email,
    userId: params.userId ?? null,
    providedData: {
      user_name: params.userName ?? "",
      order_id: params.orderId,
      tracking_code: params.trackingCode ?? "",
    },
    userData: {
      user_name: params.userName ?? "",
    },
  });
}

export async function onPasswordReset(params: {
  email: string;
  userId?: string | null;
  userName?: string;
  resetLink: string;
}) {
  return triggerEmailAutomationEvent({
    eventName: "password_reset",
    to: params.email,
    userId: params.userId ?? null,
    providedData: {
      user_name: params.userName ?? "",
      reset_link: params.resetLink,
    },
    userData: {
      user_name: params.userName ?? "",
    },
  });
}
