"use client";

import { LegalDocumentPage } from "@/components/pages/legal-document-page";
import { getTermsDocument } from "@/lib/legal/content";
import { useLanguage } from "@/components/providers/language-provider";

export function TermsPageContent() {
  const { lang } = useLanguage();
  const doc = getTermsDocument(lang);

  return (
    <LegalDocumentPage
      pageKey="terms"
      path="/terms"
      lastUpdated={doc.lastUpdated}
      sections={doc.sections}
    />
  );
}
