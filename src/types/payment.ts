import { Timestamp } from 'firebase/firestore';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type PaymentType = 'ONE_TIME' | 'SEASONAL' | 'RECURRING';

export interface Payment {
  id: string;
  beneficiaryId: string;
  categoryId: string;
  amount: number;
  date: string;
  paymentType: PaymentType;
  status: PaymentStatus;
  notes?: string;
  description?: string;
  representativeId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  deletedAt?: Timestamp;
  deletedBy?: string;
  isDeleted?: boolean;
}

export interface CreatePaymentData extends Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy' | 'isDeleted'> {
  isFromPendingRequest?: boolean;
} 