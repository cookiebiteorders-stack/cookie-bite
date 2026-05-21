"use client";

import { useCallback, useRef, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  CHAT_IMAGE_MAX_COUNT,
  CHAT_IMAGE_TYPES,
  type ChatImageAttachment,
} from "@/lib/chat/image-attachments";
import { cn } from "@/lib/utils";

export type PendingChatImage = {
  id: string;
  previewUrl: string;
  name: string;
  uploading?: boolean;
  uploaded?: ChatImageAttachment;
  error?: string;
};

type Props = {
  context: "admin" | "store";
  pending: PendingChatImage[];
  onChange: Dispatch<SetStateAction<PendingChatImage[]>>;
  disabled?: boolean;
  className?: string;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function uploadOne(file: File, context: "admin" | "store") {
  const body = new FormData();
  body.append("file", file);
  body.append("context", context);
  const res = await fetch("/api/chat/upload-image", { method: "POST", body });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    url?: string;
    error?: { en?: string; ar?: string };
  } | null;
  if (!res.ok || !data?.url) {
    const msg = data?.error?.ar ?? data?.error?.en ?? "Upload failed";
    throw new Error(msg);
  }
  return data.url;
}

export function ChatImagePreviewStrip({
  pending,
  onChange,
  className,
}: Pick<Props, "pending" | "onChange" | "className">) {
  if (pending.length === 0) return null;

  const remove = (id: string) => {
    const item = pending.find((p) => p.id === id);
    if (item?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    onChange(pending.filter((p) => p.id !== id));
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {pending.map((p) => (
        <div
          key={p.id}
          className="relative h-14 w-14 overflow-hidden rounded-xl border border-cb-border bg-cb-surface shadow-sm"
        >
          <Image src={p.previewUrl} alt="" fill className="object-cover" unoptimized />
          {p.uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
            </span>
          ) : null}
          {p.error ? (
            <span
              className="absolute inset-0 flex items-center justify-center bg-red-600/80 px-0.5 text-[8px] font-bold text-white"
              title={p.error}
            >
              !
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => remove(p.id)}
            className="absolute end-0.5 top-0.5 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/75"
            aria-label="إزالة الصورة"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ChatImageAttachButton({
  context,
  pending,
  onChange,
  disabled,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || disabled) return;
      const room = CHAT_IMAGE_MAX_COUNT - pending.length;
      if (room <= 0) return;

      const picked = Array.from(files).slice(0, room);
      const batch: PendingChatImage[] = picked.map((file) => ({
        id: newId(),
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        uploading: true,
      }));
      onChange([...pending, ...batch]);

      await Promise.all(
        batch.map(async (item, idx) => {
          const file = picked[idx]!;
          if (!CHAT_IMAGE_TYPES.has(file.type)) {
            onChange((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, uploading: false, error: "نوع ملف غير مدعوم" }
                  : p,
              ),
            );
            return;
          }
          try {
            const url = await uploadOne(file, context);
            onChange((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? {
                      ...p,
                      uploading: false,
                      uploaded: { url, mimeType: file.type, name: file.name },
                    }
                  : p,
              ),
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : "فشل الرفع";
            onChange((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, uploading: false, error: msg } : p,
              ),
            );
          }
        }),
      );
    },
    [context, disabled, onChange, pending],
  );

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    void addFiles(e.target.files);
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        disabled={disabled || pending.length >= CHAT_IMAGE_MAX_COUNT}
        onChange={onPick}
      />
      <button
        type="button"
        disabled={disabled || pending.length >= CHAT_IMAGE_MAX_COUNT}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-cb-border bg-cb-surface text-cb-text-strong transition hover:border-cb-brand-logo hover:bg-cb-peach/40 disabled:opacity-40",
          className,
        )}
        aria-label="إرفاق صورة"
        title="إرفاق صورة"
      >
        <ImagePlus className="h-4 w-4" aria-hidden />
      </button>
    </>
  );
}

export function readyAttachments(pending: PendingChatImage[]): ChatImageAttachment[] {
  return pending
    .filter((p) => p.uploaded?.url && !p.uploading && !p.error)
    .map((p) => p.uploaded!);
}

export function hasUploadingAttachments(pending: PendingChatImage[]): boolean {
  return pending.some((p) => p.uploading);
}

export function clearPendingAttachments(pending: PendingChatImage[]) {
  for (const p of pending) {
    if (p.previewUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
  }
}
