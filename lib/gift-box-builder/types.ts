export type GiftBoxBuilderState = {
  currentStep: number;
  box: string | null;
  occasion: string | null;
  items: Record<string, number>;
  msgTo: string;
  msgFrom: string;
  msgText: string;
  cardDesign: string;
  ribbonColor: string;
  wrapStyle: string;
  delivery: string;
  surprise: boolean;
  activeFilter: string;
};

export const DEFAULT_GIFT_BOX_STATE: GiftBoxBuilderState = {
  currentStep: 1,
  box: null,
  occasion: null,
  items: {},
  msgTo: "",
  msgFrom: "",
  msgText: "",
  cardDesign: "birthday",
  ribbonColor: "gold",
  wrapStyle: "kraft",
  delivery: "sameday",
  surprise: false,
  activeFilter: "All",
};

export const GIFT_BOX_STORAGE_KEY = "cb_box_state";
