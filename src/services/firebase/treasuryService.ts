import { 
  collection, 
  doc,
  getDocs, 
  addDoc,
  updateDoc, 
  deleteDoc,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { TreasuryCategory } from '../../types';
import { COLLECTIONS } from './constants';

export const treasuryServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.TREASURY));
      const categories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TreasuryCategory[];
      console.log('Raw categories from Firebase:', categories);
      return categories;
    } catch (error) {
      console.error('Error fetching treasury categories:', error);
      throw error;
    }
  },

  create: async (data: { name: string; balance: number }) => {
    try {
      await addDoc(collection(db, COLLECTIONS.TREASURY), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error creating treasury category:', error);
      throw error;
    }
  },

  adjustBalance: async (id: string, amount: number, isDeduction: boolean = false) => {
    try {
      const docRef = doc(db, COLLECTIONS.TREASURY, id);
      await runTransaction(db, async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = doc.data().balance || 0;
        const adjustedAmount = isDeduction ? -Math.abs(amount) : amount;
        const newBalance = currentBalance + adjustedAmount;
        
        if (newBalance < 0) {
          throw new Error('Insufficient funds');
        }

        transaction.update(docRef, {
          balance: newBalance,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error adjusting treasury balance:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<TreasuryCategory>) => {
    try {
      const docRef = doc(db, COLLECTIONS.TREASURY, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating treasury category:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTIONS.TREASURY, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting treasury category:', error);
      throw error;
    }
  }
}; 