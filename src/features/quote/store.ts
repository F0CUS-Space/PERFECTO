"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FurnishedStatus } from "@/config/service-quote-profiles";

import type { QuoteFrequency } from "./schema";
import type { QuoteCalculation } from "./services/pricing";

export interface QuoteDraft {
  quoteId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  bedrooms?: number;
  bathrooms?: number;
  workstations?: number;
  propertySize?: number;
  hasPets?: boolean;
  furnished?: FurnishedStatus;
  frequency: QuoteFrequency;
  addOnIds: string[];
  calculation: QuoteCalculation;
}

interface QuoteStore {
  draft: QuoteDraft | null;
  setDraft: (draft: QuoteDraft) => void;
  clearDraft: () => void;
}

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set) => ({
      draft: null,
      setDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
    }),
    { name: "perfecto-quote-draft" },
  ),
);
