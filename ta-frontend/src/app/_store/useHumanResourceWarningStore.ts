import { create } from "zustand";

type HumanResourceWarningStore = {
    hasDefaultHearingWarning: boolean;
    setHasDefaultHearingWarning: (hasWarning: boolean) => void;
};

export const useHumanResourceWarningStore = create<HumanResourceWarningStore>((set) => ({
    hasDefaultHearingWarning: false,
    setHasDefaultHearingWarning: (hasWarning) => set({ hasDefaultHearingWarning: hasWarning }),
})); 
