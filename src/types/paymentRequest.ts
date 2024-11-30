import { Timestamp } from 'firebase/firestore';

export type PaymentRequestStatus = 'CREATED' | 'PENDING' | 'COMPLETED';

export interface PaymentRequest {
  id: string;
  beneficiaryId: string;
  treasuryId: string;
  amount: number;
  paymentType: 'ONE_TIME' | 'SEASONAL' | 'RECURRING';
  startDate: string;
  endDate?: string;
  status: PaymentRequestStatus;
  notes?: string;
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface PaymentRequestFormData {
  beneficiaryId: string;
  treasuryId: string;
  amount: number;
  paymentType: 'ONE_TIME' | 'SEASONAL' | 'RECURRING';
  startDate: string;
  endDate?: string;
  notes?: string;
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  description?: string;
}