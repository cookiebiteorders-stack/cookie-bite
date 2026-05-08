"use client";

import { create } from "zustand";
import type { SearchFilters } from "@/src/types/search";

const defaultFilters: SearchFilters = {
  query: "",
  categories: [],
  brands: [],
  minPrice: null,
  maxPrice: null,
  minRating: null,
  inStockOnly: false,
  colors: [],
  sizes: [],
  sort: "popular",
  page: 1,
  view: "grid",
};

interface SearchStore {
  filters: SearchFilters;
  setFilters: (next: Partial<SearchFilters>) => void;
  clearFilters: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  filters: defaultFilters,
  setFilters: (next) =>
    set((state) => ({ filters: { ...state.filters, ...next } })),
  clearFilters: () => set({ filters: defaultFilters }),
}));

