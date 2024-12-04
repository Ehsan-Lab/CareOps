import { 
  collection, 
  doc,
  getDocs, 
  updateDoc, 
  Timestamp,
  runTransaction,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Payment } from '../../types';
import { COLLECTIONS } from './constants';

interface CreatePaymentData extends Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt'> {
  isFromPendingRequest?: boolean;
}

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

  create: async (data: CreatePaymentData) => {
    try {
      if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      await runTransaction(db, async (transaction) => {
        // Check treasury balance
        const categoryRef = doc(db, COLLECTIONS.TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;

        // Only check and deduct balance if not from a pending request
        if (!data.isFromPendingRequest) {
          if (currentBalance < data.amount) {
            throw new Error('Insufficient funds in category');
          }

          // Update treasury balance
          transaction.update(categoryRef, {
            balance: currentBalance - data.amount,
            updatedAt: Timestamp.now()
          });
        }

        // Create payment
        const paymentRef = doc(collection(db, COLLECTIONS.PAYMENTS));
        transaction.set(paymentRef, {
          ...data,
          status: 'COMPLETED',
          createdAt: Timestamp.now(),
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
      if (data.amount !== undefined && data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, COLLECTIONS.PAYMENTS, id);
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists()) {
          throw new Error('Payment not found');
        }

        const currentPayment = paymentDoc.data() as Payment;

        // If amount or category is changing, we need to adjust treasury balances
        if (data.amount !== undefined || data.categoryId !== undefined) {
          // Return amount to original category
          const originalCategoryRef = doc(db, COLLECTIONS.TREASURY, currentPayment.categoryId);
          const originalCategoryDoc = await transaction.get(originalCategoryRef);
          
          if (!originalCategoryDoc.exists()) {
            throw new Error('Original treasury category not found');
          }

          transaction.update(originalCategoryRef, {
            balance: (originalCategoryDoc.data().balance || 0) + currentPayment.amount,
            updatedAt: Timestamp.now()
          });

          // Deduct from new/current category
          const newCategoryId = data.categoryId || currentPayment.categoryId;
          const newCategoryRef = doc(db, COLLECTIONS.TREASURY, newCategoryId);
          const newCategoryDoc = await transaction.get(newCategoryRef);
          
          if (!newCategoryDoc.exists()) {
            throw new Error('New treasury category not found');
          }

          const newAmount = data.amount || currentPayment.amount;
          const newBalance = newCategoryDoc.data().balance || 0;

          if (newBalance < newAmount) {
            throw new Error('Insufficient funds in new category');
          }

          transaction.update(newCategoryRef, {
            balance: newBalance - newAmount,
            updatedAt: Timestamp.now()
          });
        }

        // Update payment
        transaction.update(paymentRef, {
          ...data,
          updatedAt: Timestamp.now()
        });
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

        const paymentData = paymentDoc.data() as Payment;
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