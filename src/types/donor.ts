/**
 * @module DonorTypes
 * @description Type definitions for donor-related entities in the charity management system
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
  /** Contact information for the donor (email, phone, etc.) */
  contact: string;
  /** Timestamp when the donor record was created */
  createdAt?: Timestamp;
} 