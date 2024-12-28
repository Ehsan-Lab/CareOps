/**
 * @module PaymentTypes
 * @description Type definitions for payment-related entities in the charity management system
 */

import { Timestamp } from 'firebase/firestore';

/**
 * @typedef {string} PaymentStatus
 * @description Possible statuses for a payment transaction
 */
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

/**
 * @typedef {string} PaymentType
 * @description Types of payment schedules supported by the system
 */
export type PaymentType = 'ONE_TIME' | 'SEASONAL' | 'RECURRING';

/**
 * @interface Payment
 * @description Represents a payment transaction in the system with full audit trail
 */
export interface Payment {
  /** Unique identifier for the payment */
  id: string;
  /** Reference to the beneficiary receiving the payment */
  beneficiaryId: string;
  /** Reference to the treasury category funding this payment */
  categoryId: string;
  /** Amount of the payment */
  amount: number;
  /** Date when the payment was/will be made */
  date: string;
  /** Type of payment schedule */
  paymentType: PaymentType;
  /** Current status of the payment */
  status: PaymentStatus;
  /** Optional notes about the payment */
  notes?: string;
  /** Detailed description of the payment purpose */
  description?: string;
  /** ID of the representative handling the payment */
  representativeId: string;
  /** Timestamp when the record was created */
  createdAt?: Timestamp;
  /** Timestamp when the record was last updated */
  updatedAt?: Timestamp;
  /** Timestamp when the record was deleted (if applicable) */
  deletedAt?: Timestamp;
  /** ID of the user who deleted the record */
  deletedBy?: string;
  /** Flag indicating if the record is marked as deleted */
  isDeleted?: boolean;
}

/**
 * @interface CreatePaymentData
 * @description Data structure for creating a new payment, omitting system-managed fields
 * @extends {Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy' | 'isDeleted'>}
 */
export interface CreatePaymentData extends Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy' | 'isDeleted'> {
  /** Flag indicating if the payment is created from a pending request */
  isFromPendingRequest?: boolean;
} 