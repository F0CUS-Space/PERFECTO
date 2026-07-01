"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  AccessStepInput,
  AgreementStepInput,
  BookingPhotoInput,
  PropertyStepInput,
  ScheduleStepInput,
} from "./schema";

interface BookingWizardStore {
  stepIndex: number;
  property: Partial<PropertyStepInput>;
  photos: BookingPhotoInput[];
  schedule: Partial<ScheduleStepInput>;
  access: Partial<AccessStepInput>;
  agreement: Partial<AgreementStepInput>;
  setStepIndex: (index: number) => void;
  setProperty: (data: Partial<PropertyStepInput>) => void;
  setPhotos: (photos: BookingPhotoInput[]) => void;
  setSchedule: (data: Partial<ScheduleStepInput>) => void;
  setAccess: (data: Partial<AccessStepInput>) => void;
  setAgreement: (data: Partial<AgreementStepInput>) => void;
  resetWizard: () => void;
}

const initialState = {
  stepIndex: 0,
  property: {},
  photos: [] as BookingPhotoInput[],
  schedule: {},
  access: {},
  agreement: {},
};

export const useBookingWizardStore = create<BookingWizardStore>()(
  persist(
    (set) => ({
      ...initialState,
      setStepIndex: (stepIndex) => set({ stepIndex }),
      setProperty: (property) => set((s) => ({ property: { ...s.property, ...property } })),
      setPhotos: (photos) => set({ photos }),
      setSchedule: (schedule) => set((s) => ({ schedule: { ...s.schedule, ...schedule } })),
      setAccess: (access) => set((s) => ({ access: { ...s.access, ...access } })),
      setAgreement: (agreement) => set((s) => ({ agreement: { ...s.agreement, ...agreement } })),
      resetWizard: () => set(initialState),
    }),
    { name: "perfecto-booking-wizard" },
  ),
);
