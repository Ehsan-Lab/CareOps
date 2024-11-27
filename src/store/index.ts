import { create } from 'zustand';
import { Donor, Donation, FeedingRound, TreasuryCategory, Beneficiary } from '../types';

interface AppState {
  donors: Donor[];
  donations: Donation[];
  feedingRounds: FeedingRound[];
  treasuryCategories: TreasuryCategory[];
  beneficiaries: Beneficiary[];
  setDonors: (donors: Donor[]) => void;
  setDonations: (donations: Donation[]) => void;
  setFeedingRounds: (rounds: FeedingRound[]) => void;
  setTreasuryCategories: (categories: TreasuryCategory[]) => void;
  setBeneficiaries: (beneficiaries: Beneficiary[]) => void;
}

export const useStore = create<AppState>((set) => ({
  donors: [],
  donations: [],
  feedingRounds: [],
  treasuryCategories: [],
  beneficiaries: [],
  setDonors: (donors) => set({ donors }),
  setDonations: (donations) => set({ donations }),
  setFeedingRounds: (feedingRounds) => set({ feedingRounds }),
  setTreasuryCategories: (treasuryCategories) => set({ treasuryCategories }),
  setBeneficiaries: (beneficiaries) => set({ beneficiaries })
}));

if (process.env.NODE_ENV === 'development') {
  useStore.subscribe((state) => {
    console.log('Store updated:', state);
  });
}