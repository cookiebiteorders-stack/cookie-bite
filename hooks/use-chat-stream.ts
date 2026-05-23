"use client";

import { useCallback, useRef, useState } from "react";
import { getChatbotConfig } from "@/lib/ai-chat/config";
import { parseStreamResponse } from "@/lib/ai-chat/stream-parser";
import type { ChatApiMessage, ChatMessage } from "@/lib/ai-chat/types";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type UseChatStreamOptions = {
  endpoint?: string;
  /** يُستدعى قبل الإرسال لبناء جسم الطلب */
  buildBody?: (
    messages: ChatApiMessage[],
    userMessage: ChatApiMessage,
  ) => Record<string, unknown>;
  onMeta?: (meta: Record<string, unknown>) => void;
  onComplete?: (assistantMessage: ChatMessage) => void;
  onError?: (message: string) => void;
};

export function useChatStream(options: UseChatStreamOptions = {}) {
  const {
    endpoint = "/api/chat",
    buildBody,
    onMeta,
    onComplete,
    onError,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const lastPayloadRef = useRef<{
    apiMessages: ChatApiMessage[];
    userMessage: ChatApiMessage;
  } | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamingId(null);
    setStreamBuffer("");
  }, []);

  const runStream = useCallback(
    async (apiMessages: ChatApiMessage[], userMessage: ChatApiMessage) => {
      lastPayloadRef.current = { apiMessages, userMessage };
      setLastError(null);
      setIsStreaming(true);
      setStreamBuffer("");

      const assistantId = newId();
      setStreamingId(assistantId);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          status: "streaming",
          createdAt: Date.now(),
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      const body = buildBody
        ? buildBody(apiMessages, userMessage)
        : { messages: apiMessages };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          const msg =
            data?.error?.ar ??
            data?.error?.en ??
            `Request failed (${res.status})`;
          throw new Error(msg);
        }

        let fullText = "";
        for await (const event of parseStreamResponse(res.body)) {
          if (event.type === "token") {
            fullText += event.content;
            setStreamBuffer(fullText);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: fullText } : m,
              ),
            );
          } else if (event.type === "done") {
            if (event.meta) onMeta?.(event.meta);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }

        const finalMsg: ChatMessage = {
          id: assistantId,
          role: "assistant",
          content: fullText,
          status: "complete",
          createdAt: Date.now(),
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? finalMsg : m)),
        );
        onComplete?.(finalMsg);
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Stream failed";
        setLastError(msg);
        onError?.(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, status: "error", error: msg, content: m.content || msg }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
        setStreamingId(null);
        setStreamBuffer("");
        abortRef.current = null;
      }
    },
    [buildBody, endpoint, onComplete, onError, onMeta],
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (queueRef.current.length > 0 && !isStreaming) {
        const text = queueRef.current.shift();
        if (!text) continue;
        const userMessage: ChatApiMessage = { role: "user", content: text };
        const apiMessages: ChatApiMessage[] = [
          ...messages
            .filter((m) => m.status === "complete" || m.role === "user")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          userMessage,
        ];
        await runStream(apiMessages, userMessage);
      }
    } finally {
      processingRef.current = false;
    }
  }, [isStreaming, messages, runStream]);

  const send = useCallback(
    async (content: string, extras?: Partial<ChatApiMessage>) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const userMessage: ChatApiMessage = {
        role: "user",
        content: trimmed,
        ...extras,
      };

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "user",
          content: trimmed,
          status: "complete",
          createdAt: Date.now(),
          imageUrls: extras?.attachments?.map((a) => a.url),
        },
      ]);

      const apiMessages: ChatApiMessage[] = [
        ...messages
          .filter((m) => m.status !== "error")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
            attachments: m.imageUrls?.map((url) => ({ url })),
          })),
        userMessage,
      ];

      if (isStreaming && getChatbotConfig().streaming.enabled) {
        queueRef.current.push(trimmed);
        return;
      }

      await runStream(apiMessages, userMessage);
    },
    [isStreaming, messages, runStream],
  );

  const retry = useCallback(async () => {
    const last = lastPayloadRef.current;
    if (!last) return;
    setMessages((prev) => {
      const copy = [...prev];
      while (copy.length && copy[copy.length - 1]?.role === "assistant") {
        copy.pop();
      }
      return copy;
    });
    await runStream(last.apiMessages, last.userMessage);
  }, [runStream]);

  return {
    messages,
    send,
    abort,
    retry,
    isStreaming,
    streamBuffer,
    streamingId,
    lastError,
    processQueue,
    setMessages,
  };
}
