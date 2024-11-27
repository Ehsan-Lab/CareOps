import { 
  collection, 
  doc,
  getDocs, 
  updateDoc, 
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FeedingRound } from '../../types';
import { COLLECTIONS } from './constants';

export const feedingRoundServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.FEEDING_ROUNDS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedingRound[];
    } catch (error) {
      console.error('Error fetching feeding rounds:', error);
      throw error;
    }
  },

  create: async (data: Omit<FeedingRound, 'id'>) => {
    try {
      await runTransaction(db, async (transaction) => {
        const categoryRef = doc(db, COLLECTIONS.TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Feeding category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        if (currentBalance < data.allocatedAmount) {
          throw new Error('Insufficient funds in feeding category');
        }

        const roundRef = doc(collection(db, COLLECTIONS.FEEDING_ROUNDS));
        transaction.set(roundRef, {
          ...data,
          createdAt: Timestamp.now()
        });

        transaction.update(categoryRef, {
          balance: currentBalance - data.allocatedAmount,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error creating feeding round:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<FeedingRound>) => {
    try {
      const docRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating feeding round:', error);
      throw error;
    }
  },

  updateStatus: async (id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      const docRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating feeding round status:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const roundRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
        const roundDoc = await transaction.get(roundRef);
        
        if (!roundDoc.exists()) {
          throw new Error('Feeding round not found');
        }

        const roundData = roundDoc.data();
        const categoryRef = doc(db, COLLECTIONS.TREASURY, roundData.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Feeding category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;

        transaction.delete(roundRef);
        transaction.update(categoryRef, {
          balance: currentBalance + roundData.allocatedAmount,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error deleting feeding round:', error);
      throw error;
    }
  }
}; 