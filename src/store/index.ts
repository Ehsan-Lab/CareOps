import { create } from 'zustand';
import { Donor, Donation, FeedingRound, TreasuryCategory, Beneficiary, Payment } from '../types';

interface AppState {
  donors: Donor[];
  donations: Donation[];
  feedingRounds: FeedingRound[];
  treasuryCategories: TreasuryCategory[];
  beneficiaries: Beneficiary[];
  payments: Payment[];
  setDonors: (donors: Donor[]) => void;
  setDonations: (donations: Donation[]) => void;
  setFeedingRounds: (rounds: FeedingRound[]) => void;
  setTreasuryCategories: (categories: TreasuryCategory[]) => void;
  setBeneficiaries: (beneficiaries: Beneficiary[]) => void;
  setPayments: (payments: Payment[]) => void;
}

export const useStore = create<AppState>((set) => ({
  donors: [],
  donations: [],
  feedingRounds: [],
  treasuryCategories: [],
  beneficiaries: [],
  payments: [],
  setDonors: (donors) => set({ donors }),
  setDonations: (donations) => set({ donations }),
  setFeedingRounds: (feedingRounds) => set({ feedingRounds }),
  setTreasuryCategories: (treasuryCategories) => set({ treasuryCategories }),
  setBeneficiaries: (beneficiaries) => set({ beneficiaries }),
  setPayments: (payments) => set({ payments })
}));

if (process.env.NODE_ENV === 'development') {
  useStore.subscribe((state) => {
    console.log('Store updated:', {
      ...state,
      beneficiariesDetails: {
        count: state.beneficiaries.length,
        items: state.beneficiaries,
        activeCount: state.beneficiaries.filter(b => b.status === 'ACTIVE').length,
        statuses: state.beneficiaries.map(b => b.status)
      }
    });
  });
}