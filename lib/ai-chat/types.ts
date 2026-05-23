export type ChatRole = "user" | "assistant" | "system";

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "done"; meta?: Record<string, unknown> }
  | { type: "error"; message: string; code?: string };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status: "complete" | "streaming" | "error" | "queued";
  createdAt: number;
  imageUrls?: string[];
  error?: string;
};

export type ChatApiMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: Array<{ url: string; mimeType?: string; name?: string }>;
};
