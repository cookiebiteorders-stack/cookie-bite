"use client";

import { LegalDocumentPage } from "@/components/pages/legal-document-page";
import { useFreeShippingThreshold } from "@/components/providers/store-commerce-settings-provider";
import { getTermsDocument } from "@/lib/legal/content";
import type { LegalDocumentMeta } from "@/lib/legal/types";
import { useLanguage } from "@/components/providers/language-provider";
import { interpolateFreeShippingThreshold } from "@/lib/store/commerce-settings-shared";

function withThreshold(doc: LegalDocumentMeta, threshold: number): LegalDocumentMeta {
  return {
    ...doc,
    sections: doc.sections.map((section) => ({
      ...section,
      paragraphs: section.paragraphs?.map((p) =>
        interpolateFreeShippingThreshold(p, threshold),
      ),
      list: section.list?.map((item) => interpolateFreeShippingThreshold(item, threshold)),
    })),
  };
}

export function TermsPageContent() {
  const { lang } = useLanguage();
  const threshold = useFreeShippingThreshold();
  const doc = withThreshold(getTermsDocument(lang), threshold);

  return (
    <LegalDocumentPage
      pageKey="terms"
      path="/terms"
      lastUpdated={doc.lastUpdated}
      sections={doc.sections}
    />
  );
}
