/**
 * @module PaymentRequestTypes
 * @description Type definitions for payment request entities in the charity management system
 */

import { Timestamp } from 'firebase/firestore';

/**
 * @typedef {string} PaymentRequestStatus
 * @description Possible statuses for a payment request
 */
export type PaymentRequestStatus = 'CREATED' | 'PENDING' | 'COMPLETED';

/**
 * @interface PaymentRequest
 * @description Represents a request for payment to be made to a beneficiary
 */
export interface PaymentRequest {
  /** Unique identifier for the payment request */
  id: string;
  /** Reference to the beneficiary the payment is for */
  beneficiaryId: string;
  /** Reference to the treasury account funding this payment */
  treasuryId: string;
  /** Amount requested for payment */
  amount: number;
  /** Type of payment schedule requested */
  paymentType: 'ONE_TIME' | 'SEASONAL' | 'RECURRING';
  /** Date when the payment should start */
  startDate: string;
  /** Optional end date for recurring payments */
  endDate?: string;
  /** Current status of the payment request */
  status: PaymentRequestStatus;
  /** Optional notes about the payment request */
  notes?: string;
  /** Frequency of recurring payments */
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  /** Detailed description of the payment purpose */
  description?: string;
  /** Timestamp when the request was created */
  createdAt?: Timestamp;
  /** Timestamp when the request was last updated */
  updatedAt?: Timestamp;
}

/**
 * @interface PaymentRequestFormData
 * @description Data structure for creating a new payment request through a form
 * Omits system-managed fields like id, status, and timestamps
 */
export interface PaymentRequestFormData {
  /** Reference to the beneficiary the payment is for */
  beneficiaryId: string;
  /** Reference to the treasury account funding this payment */
  treasuryId: string;
  /** Amount requested for payment */
  amount: number;
  /** Type of payment schedule requested */
  paymentType: 'ONE_TIME' | 'SEASONAL' | 'RECURRING';
  /** Date when the payment should start */
  startDate: string;
  /** Optional end date for recurring payments */
  endDate?: string;
  /** Optional notes about the payment request */
  notes?: string;
  /** Frequency of recurring payments */
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  /** Detailed description of the payment purpose */
  description?: string;
}