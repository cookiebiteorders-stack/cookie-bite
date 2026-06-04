import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  groupTemplatesByCategory,
  renderTemplate,
} from "@/lib/notification-library";
import { resolveRecipientTemplateVars } from "@/lib/notification-library/resolve-recipient-vars";

/**
 * Lists every template in the library, or returns a single rendered preview
 * when `?key=<template-key>` is provided.
 *
 *  - GET                       → list of categories + templates + sampleVars
 *  - GET ?key=welcome          → { subject, html, preheader, meta }
 *  - GET ?key=welcome&lang=ar  → Arabic-rendered preview
 *  - GET ?key=welcome&to=user@mail.com → preview with recipient name/data
 */
export async function GET(req: NextRequest) {
  await requireAdminAccess("templates");

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const lang = (searchParams.get("lang") ?? "en") as "en" | "ar";
  const to = searchParams.get("to")?.trim().toLowerCase() ?? "";

  if (!key) {
    return NextResponse.json({
      groups: groupTemplatesByCategory(),
    });
  }

  let overrides: Record<string, string | number> | undefined;
  const overridesParam = searchParams.get("vars");
  if (overridesParam) {
    try {
      overrides = JSON.parse(overridesParam) as Record<string, string | number>;
    } catch {
      // fall through with no overrides
    }
  }

  let recipientVars: Record<string, string | number> = {};
  if (to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    recipientVars = await resolveRecipientTemplateVars(to);
  }

  const rendered = renderTemplate(
    key,
    { ...recipientVars, ...overrides },
    { lang },
  );
  if (!rendered) {
    return NextResponse.json(
      {
        error: {
          en: `Template "${key}" not found`,
          ar: `القالب "${key}" غير موجود`,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    key: rendered.key,
    subject: rendered.subject,
    preheader: rendered.preheader,
    html: rendered.html,
  });
}
