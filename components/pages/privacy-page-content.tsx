"use client";

import { LegalDocumentPage } from "@/components/pages/legal-document-page";
import { getPrivacyDocument } from "@/lib/legal/content";
import { useLanguage } from "@/components/providers/language-provider";

export function PrivacyPageContent() {
  const { lang } = useLanguage();
  const doc = getPrivacyDocument(lang);

  return (
    <LegalDocumentPage
      pageKey="privacy"
      path="/privacy"
      lastUpdated={doc.lastUpdated}
      sections={doc.sections}
    />
  );
}
