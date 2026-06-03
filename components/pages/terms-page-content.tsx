"use client";

import { LegalDocumentPage } from "@/components/pages/legal-document-page";
import { useLanguage } from "@/components/providers/language-provider";

export function TermsPageContent() {
  const { t } = useLanguage();

  return (
    <LegalDocumentPage
      pageKey="terms"
      path="/terms"
      sections={[
        {
          paragraphs: [t("legal.terms.p1"), t("legal.terms.p2")],
        },
        {
          paragraphs: [t("legal.terms.summary")],
          highlight: true,
        },
      ]}
    />
  );
}
