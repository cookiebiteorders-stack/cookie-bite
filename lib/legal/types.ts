export type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
  list?: string[];
  highlight?: boolean;
};

export type LegalDocumentMeta = {
  lastUpdated: string;
  sections: LegalSection[];
};
