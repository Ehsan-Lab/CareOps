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
  createdAt?: any;
  updatedAt?: any;
}

export interface TreasuryCategory {
  id: number;
  name: string;
  balance: number;
}