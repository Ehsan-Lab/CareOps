import { create } from 'zustand';
import { Donor, Donation, FeedingRound, TreasuryCategory } from '../types';

interface AppState {
  donors: Donor[];
  donations: Donation[];
  feedingRounds: FeedingRound[];
  treasuryCategories: TreasuryCategory[];
  setDonors: (donors: Donor[]) => void;
  setDonations: (donations: Donation[]) => void;
  setFeedingRounds: (rounds: FeedingRound[]) => void;
  setTreasuryCategories: (categories: TreasuryCategory[]) => void;
}

export const useStore = create<AppState>((set) => ({
  donors: [],
  donations: [],
  feedingRounds: [],
  treasuryCategories: [],
  setDonors: (donors) => {
    console.log('Setting donors in store:', donors);
    set({ donors });
  },
  setDonations: (donations) => set({ donations }),
  setFeedingRounds: (feedingRounds) => set({ feedingRounds }),
  setTreasuryCategories: (treasuryCategories) => set({ treasuryCategories }),
}));

if (process.env.NODE_ENV === 'development') {
  useStore.subscribe((state) => {
    console.log('Store updated:', state);
  });
}