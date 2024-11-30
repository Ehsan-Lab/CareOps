export interface Donor {
  id: number;
  name: string;
  contact: string;
}

export interface Donation {
  id: number;
  donorId: number;
  amount: number;
  purpose: string;
  date: string;
  categoryId: number;
}

export interface FeedingRound {
  id: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  allocatedAmount: number;
  categoryId: string;
  driveLink?: string;
  description?: string;
  unitPrice: number;
  observations?: string;
  specialCircumstances?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface TreasuryCategory {
  id: number;
  name: string;
  balance: number;
}

export type SupportType = 'MEDICAL' | 'EDUCATION' | 'FOOD' | 'HOUSING' | 'EMERGENCY';

export interface Beneficiary {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  supportType: SupportType;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: any;
  updatedAt?: any;
}

export type PaymentType = 'ONE_TIME' | 'SEASONAL' | 'RECURRING';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface Payment {
  id: string;
  beneficiaryId: string;
  treasuryId: string;
  categoryId: string;
  amount: number;
  date: string;
  paymentType: PaymentType;
  representativeId: string;
  notes?: string;
  status: PaymentStatus;
  createdAt?: any;
  updatedAt?: any;
}