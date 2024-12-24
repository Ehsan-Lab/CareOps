/**
 * @module FirebaseServices
 * @description Entry point for all Firebase-related services and types
 * Exports all service objects and necessary types for use throughout the application
 */

/** Export all service objects */
export { COLLECTIONS } from './constants';
export { donorServices } from './donorService';
export { donationServices } from './donationService';
export { feedingRoundServices } from './feedingRoundService';
export { treasuryServices } from './treasuryService';
export { beneficiaryServices } from './beneficiaryService';
export { paymentServices } from './paymentService';

/** Export shared types */
export type {
  CreateDonationData
} from './donationService'; 