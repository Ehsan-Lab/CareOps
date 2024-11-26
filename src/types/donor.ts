import { Timestamp } from 'firebase/firestore';

export interface Donor {
  id: string;
  name: string;
  contact: string;
  createdAt?: Timestamp;
} 