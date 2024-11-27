import { 
  collection, 
  doc,
  getDocs, 
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Donation } from '../../types';
import { COLLECTIONS } from './constants';

interface CreateDonationData {
  donorId: string;
  amount: number;
  purpose: string;
  categoryId: string;
  date: string;
}

export const donationServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.DONATIONS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Donation[];
    } catch (error) {
      console.error('Error fetching donations:', error);
      throw error;
    }
  },

  create: async (data: CreateDonationData) => {
    try {
      await runTransaction(db, async (transaction) => {
        // First, do all reads
        const categoryRef = doc(db, COLLECTIONS.TREASURY, String(data.categoryId));
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;

        // Then, do all writes
        // 1. Create donation
        const donationRef = doc(collection(db, COLLECTIONS.DONATIONS));
        transaction.set(donationRef, {
          donorId: String(data.donorId),
          amount: Number(data.amount),
          purpose: data.purpose,
          categoryId: String(data.categoryId),
          date: data.date,
          createdAt: Timestamp.now()
        });

        // 2. Update treasury balance
        transaction.update(categoryRef, {
          balance: currentBalance + Number(data.amount),
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error creating donation:', error);
      throw error;
    }
  }
}; 