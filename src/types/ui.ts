export type ToastVariant = "success" | "error" | "info" | "cart";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
}

