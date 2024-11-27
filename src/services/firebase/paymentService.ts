import { 
  collection, 
  doc,
  getDocs, 
  updateDoc, 
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Payment } from '../../types';
import { COLLECTIONS } from './constants';

export const paymentServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  create: async (data: Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      await runTransaction(db, async (transaction) => {
        // Check treasury balance
        const categoryRef = doc(db, COLLECTIONS.TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        if (currentBalance < data.amount) {
          throw new Error('Insufficient funds in category');
        }

        // Create payment
        const paymentRef = doc(collection(db, COLLECTIONS.PAYMENTS));
        transaction.set(paymentRef, {
          ...data,
          status: 'COMPLETED',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });

        // Update treasury balance
        transaction.update(categoryRef, {
          balance: currentBalance - data.amount,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Payment>) => {
    try {
      const docRef = doc(db, COLLECTIONS.PAYMENTS, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  cancel: async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, COLLECTIONS.PAYMENTS, id);
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists()) {
          throw new Error('Payment not found');
        }

        const paymentData = paymentDoc.data();
        if (paymentData.status === 'CANCELLED') {
          throw new Error('Payment already cancelled');
        }

        // Refund the amount to treasury
        const categoryRef = doc(db, COLLECTIONS.TREASURY, paymentData.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;

        // Update payment status
        transaction.update(paymentRef, {
          status: 'CANCELLED',
          updatedAt: Timestamp.now()
        });

        // Refund amount to treasury
        transaction.update(categoryRef, {
          balance: currentBalance + paymentData.amount,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  }
}; 