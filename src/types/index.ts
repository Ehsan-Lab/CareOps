/**
 * @module Types
 * @description Core type definitions for the charity management system
 */

import { Timestamp } from 'firebase/firestore';

/**
 * @interface Donor
 * @description Represents a donor who contributes to the charity
 */
export interface Donor {
  /** Unique identifier for the donor */
  id: string;
  /** Full name of the donor */
  name: string;
  /** Contact information for the donor */
  contact: string;
}

/**
 * @interface Donation
 * @description Represents a monetary contribution made by a donor
 */
export interface Donation {
  /** Unique identifier for the donation */
  id: string;
  /** Reference to the donor who made the contribution */
  donorId: string;
  /** Amount of the donation */
  amount: number;
  /** Purpose or intended use of the donation */
  purpose: string;
  /** Date when the donation was made */
  date: string;
  /** Reference to the treasury category this donation belongs to */
  categoryId: string;
}

/**
 * @interface FeedingRound
 * @description Represents a feeding event or distribution session
 */
export interface FeedingRound {
  /** Unique identifier for the feeding round */
  id: string;
  /** Date when the feeding round takes place */
  date: string;
  /** Current status of the feeding round */
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  /** Total amount allocated for this feeding round */
  allocatedAmount: number;
  /** Reference to the treasury category funding this round */
  categoryId: string;
  /** Optional link to drive containing related documents */
  driveLink?: string;
  /** Description of the feeding round */
  description?: string;
  /** Cost per unit/person for this feeding round */
  unitPrice: number;
  /** Any observations made during the round */
  observations?: string;
  /** Any special circumstances to note */
  specialCircumstances?: string;
  /** Timestamp of when the record was created */
  createdAt?: Timestamp;
  /** Timestamp of when the record was last updated */
  updatedAt?: Timestamp;
  /** Array of photo URLs associated with this feeding round */
  photos?: string[];
}

/**
 * @interface TreasuryCategory
 * @description Represents a category in the treasury for organizing funds
 */
export interface TreasuryCategory {
  /** Unique identifier for the category */
  id: string;
  /** Name of the treasury category */
  name: string;
  /** Current balance in this category */
  balance: number;
  /** Description of the category's purpose */
  description?: string;
  /** Timestamp of when the record was created */
  createdAt?: Timestamp;
  /** Timestamp of when the record was last updated */
  updatedAt?: Timestamp;
}

/**
 * @typedef {string} SupportType
 * @description Types of support that can be provided to beneficiaries
 */
export type SupportType = 'MEDICAL' | 'EDUCATION' | 'FOOD' | 'HOUSING' | 'EMERGENCY';

/**
 * @interface Beneficiary
 * @description Represents a person receiving support from the charity
 */
export interface Beneficiary {
  /** Unique identifier for the beneficiary */
  id: string;
  /** Full name of the beneficiary */
  name: string;
  /** Email address of the beneficiary */
  email: string;
  /** Phone number of the beneficiary */
  phone: string;
  /** Physical address of the beneficiary */
  address: string;
  /** Type of support the beneficiary receives */
  supportType: SupportType;
  /** Current status of the beneficiary */
  status: 'ACTIVE' | 'INACTIVE';
  /** Timestamp of when the record was created */
  createdAt?: Timestamp;
  /** Timestamp of when the record was last updated */
  updatedAt?: Timestamp;
}

/**
 * @typedef {string} PaymentType
 * @description Types of payments that can be made
 */
export type PaymentType = 'ONE_TIME' | 'SEASONAL' | 'RECURRING';

/**
 * @typedef {string} PaymentStatus
 * @description Possible statuses for a payment
 */
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

/**
 * @interface Payment
 * @description Represents a payment made to a beneficiary
 */
export interface Payment {
  /** Unique identifier for the payment */
  id: string;
  /** Reference to the beneficiary receiving the payment */
  beneficiaryId: string;
  /** Reference to the treasury account */
  treasuryId: string;
  /** Reference to the treasury category */
  categoryId: string;
  /** Amount of the payment */
  amount: number;
  /** Date when the payment was/will be made */
  date: string;
  /** Type of payment */
  paymentType: PaymentType;
  /** ID of the representative handling the payment */
  representativeId: string;
  /** Optional notes about the payment */
  notes?: string;
  /** Current status of the payment */
  status: PaymentStatus;
  /** Timestamp of when the record was created */
  createdAt?: Timestamp;
  /** Timestamp of when the record was last updated */
  updatedAt?: Timestamp;
}

export interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  category: string;
  date: string;
  reference: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}