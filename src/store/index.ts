/**
 * @module Store
 * @description Global state management using Zustand for the charity management application
 */

import { create } from 'zustand';
import { Donor, Donation, FeedingRound, TreasuryCategory, Beneficiary, Payment } from '../types';
import { PaymentRequest } from '../types/paymentRequest';

/**
 * @interface AppState
 * @description Defines the structure and actions of the global application state
 */
interface AppState {
  /** Array of all donors in the system */
  donors: Donor[];
  /** Array of all donations received */
  donations: Donation[];
  /** Array of all feeding rounds/events */
  feedingRounds: FeedingRound[];
  /** Array of treasury categories for financial organization */
  treasuryCategories: TreasuryCategory[];
  /** Array of beneficiaries receiving aid */
  beneficiaries: Beneficiary[];
  /** Array of payments made */
  payments: Payment[];
  /** Array of pending payment requests */
  paymentRequests: PaymentRequest[];

  /**
   * Updates the donors list in the global state
   * @param donors - New array of donors to set
   */
  setDonors: (donors: Donor[]) => void;

  /**
   * Updates the donations list in the global state
   * @param donations - New array of donations to set
   */
  setDonations: (donations: Donation[]) => void;

  /**
   * Updates the feeding rounds list in the global state
   * @param rounds - New array of feeding rounds to set
   */
  setFeedingRounds: (rounds: FeedingRound[]) => void;

  /**
   * Updates the treasury categories list in the global state
   * @param categories - New array of treasury categories to set
   */
  setTreasuryCategories: (categories: TreasuryCategory[]) => void;

  /**
   * Updates the beneficiaries list in the global state
   * @param beneficiaries - New array of beneficiaries to set
   */
  setBeneficiaries: (beneficiaries: Beneficiary[]) => void;

  /**
   * Updates the payments list in the global state
   * @param payments - New array of payments to set
   */
  setPayments: (payments: Payment[]) => void;

  /**
   * Updates the payment requests list in the global state
   * @param requests - New array of payment requests to set
   */
  setPaymentRequests: (requests: PaymentRequest[]) => void;
}

/**
 * @constant
 * @description Creates a Zustand store with the defined AppState interface
 * @returns A hook that can be used to access and modify the global state
 */
export const useStore = create<AppState>((set) => ({
  donors: [],
  donations: [],
  feedingRounds: [],
  treasuryCategories: [],
  beneficiaries: [],
  payments: [],
  paymentRequests: [],
  setDonors: (donors) => set({ donors }),
  setDonations: (donations) => set({ donations }),
  setFeedingRounds: (feedingRounds) => set({ feedingRounds }),
  setTreasuryCategories: (treasuryCategories) => set({ treasuryCategories }),
  setBeneficiaries: (beneficiaries) => set({ beneficiaries }),
  setPayments: (payments) => set({ payments }),
  setPaymentRequests: (paymentRequests) => set({ paymentRequests })
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