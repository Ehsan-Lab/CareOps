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
  id: number;
  date: string;
  allocatedAmount: number;
  defaultAmount: number;
  categoryId: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface TreasuryCategory {
  id: number;
  name: string;
  balance: number;
}