/**
 * @module TreasuryTypes
 * @description Type definitions for treasury-related entities in the charity management system
 */

import { Timestamp } from 'firebase/firestore';

/**
 * @interface Treasury
 * @description Represents a treasury account in the charity
 */
export interface Treasury {
  /** Unique identifier for the treasury account */
  id: string;
  /** Name of the treasury account */
  name: string;
  /** Current balance in the treasury account */
  balance: number;
  /** Description of the treasury account's purpose */
  description?: string;
  /** Timestamp when the treasury account was created */
  createdAt?: Timestamp;
  /** Timestamp when the treasury account was last updated */
  updatedAt?: Timestamp;
}

/**
 * @interface TreasuryCategory
 * @description Represents a category within a treasury account for organizing funds
 */
export interface TreasuryCategory {
  /** Unique identifier for the category */
  id: string;
  /** Reference to the parent treasury account */
  treasuryId: string;
  /** Name of the category */
  name: string;
  /** Current balance in this category */
  balance: number;
  /** Description of the category's purpose */
  description?: string;
  /** Timestamp when the category was created */
  createdAt?: Timestamp;
  /** Timestamp when the category was last updated */
  updatedAt?: Timestamp;
}

/**
 * @interface TreasuryTransaction
 * @description Represents a transaction in the treasury system
 */
export interface TreasuryTransaction {
  /** Unique identifier for the transaction */
  id: string;
  /** Reference to the treasury account */
  treasuryId: string;
  /** Reference to the treasury category */
  categoryId: string;
  /** Amount of the transaction */
  amount: number;
  /** Type of transaction (credit or debit) */
  type: 'CREDIT' | 'DEBIT';
  /** Date of the transaction */
  date: string;
  /** Description of the transaction */
  description: string;
  /** Reference to related entity (payment, donation, etc.) */
  referenceId?: string;
  /** Type of the reference (payment, donation, etc.) */
  referenceType?: 'PAYMENT' | 'DONATION' | 'ADJUSTMENT';
  /** Timestamp when the transaction was created */
  createdAt?: Timestamp;
  /** Timestamp when the transaction was last updated */
  updatedAt?: Timestamp;
} 