"use client";

import { LegalDocumentPage } from "@/components/pages/legal-document-page";
import { useLanguage } from "@/components/providers/language-provider";

export function PrivacyPageContent() {
  const { t } = useLanguage();

  return (
    <LegalDocumentPage
      pageKey="privacy"
      path="/privacy"
      sections={[
        {
          paragraphs: [t("legal.privacy.p1"), t("legal.privacy.p2")],
        },
        {
          paragraphs: [t("legal.privacy.summary")],
          highlight: true,
        },
      ]}
    />
  );
}
