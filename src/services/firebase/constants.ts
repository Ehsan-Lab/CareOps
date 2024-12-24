/**
 * @module FirebaseConstants
 * @description Constants used throughout the Firebase services
 */

/**
 * @constant
 * @description Collection names used in Firestore database
 * @readonly
 * @enum {string}
 */
export const COLLECTIONS = {
  /** Collection for storing donor information */
  DONORS: 'donors',
  /** Collection for storing donation records */
  DONATIONS: 'donations',
  /** Collection for storing feeding round events */
  FEEDING_ROUNDS: 'feedingRounds',
  /** Collection for storing treasury categories and balances */
  TREASURY: 'treasury',
  /** Collection for storing beneficiary information */
  BENEFICIARIES: 'beneficiaries',
  /** Collection for storing payment records */
  PAYMENTS: 'payments',
  /** Collection for storing payment request records */
  PAYMENT_REQUESTS: 'paymentRequests'
} as const;