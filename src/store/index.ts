/**
 * @module Store
 * @description Global state management using Zustand for the charity management application
 */

import { create } from 'zustand';
import { Beneficiary, Donor, Donation, Payment, FeedingRound, TreasuryCategory, Transaction } from '../types';

interface AppState {
  // Connection state
  isOnline: boolean;
  setOnline: (status: boolean) => void;

  // Data
  beneficiaries: Beneficiary[];
  donors: Donor[];
  donations: Donation[];
  feedingRounds: FeedingRound[];
  treasuryCategories: TreasuryCategory[];
  payments: Payment[];
  transactions: Transaction[];

  // Actions
  setBeneficiaries: (beneficiaries: Beneficiary[]) => void;
  setDonors: (donors: Donor[]) => void;
  setDonations: (donations: Donation[]) => void;
  setFeedingRounds: (rounds: FeedingRound[]) => void;
  setTreasuryCategories: (categories: TreasuryCategory[]) => void;
  setPayments: (payments: Payment[]) => void;
  setTransactions: (transactions: Transaction[]) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Connection state
  isOnline: true,
  setOnline: (status) => set({ isOnline: status }),

  // Data
  beneficiaries: [],
  donors: [],
  donations: [],
  feedingRounds: [],
  treasuryCategories: [],
  payments: [],
  transactions: [],

  // Actions
  setBeneficiaries: (beneficiaries) => set({ beneficiaries }),
  setDonors: (donors) => set({ donors }),
  setDonations: (donations) => set({ donations }),
  setFeedingRounds: (feedingRounds) => set({ feedingRounds }),
  setTreasuryCategories: (treasuryCategories) => set({ treasuryCategories }),
  setPayments: (payments) => set({ payments }),
  setTransactions: (transactions) => set({ transactions }),

  // UI State
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

// Development environment state logger
if (process.env.NODE_ENV === 'development') {
  /**
   * @description Debug subscriber that logs state updates in development environment
   * Provides detailed information about beneficiaries including counts and status
   */
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