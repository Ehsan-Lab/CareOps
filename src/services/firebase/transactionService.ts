import { 
  collection, 
  doc,
  getDocs, 
  addDoc, 
  updateDoc, 
  Timestamp,
  runTransaction,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { generateId } from '../../utils/idGenerator';
import { validateTransaction, validatePaymentRequestTransition, validateBalances } from '../../utils/transactionValidator';
import { COLLECTIONS } from './constants';

export const transactionServices = {
  createPaymentRequest: async (data: any) => {
    try {
      const requestId = generateId('PR');
      
      await runTransaction(db, async (transaction) => {
        // Validate treasury balance
        const categoryRef = doc(db, COLLECTIONS.TREASURY, data.treasuryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const validationResult = validateTransaction(
          data.treasuryId,
          data.beneficiaryId,
          data.amount,
          categoryDoc.data().balance,
          {
            timestamp: Timestamp.now(),
            description: data.description,
            type: data.paymentType
          }
        );

        if (!validationResult.isValid) {
          throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
        }

        // Create payment request with generated ID
        const requestRef = doc(collection(db, COLLECTIONS.PAYMENT_REQUESTS), requestId);
        transaction.set(requestRef, {
          id: requestId,
          ...data,
          status: 'CREATED',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      });

      return requestId;
    } catch (error) {
      console.error('Error creating payment request:', error);
      throw error;
    }
  },

  completePaymentRequest: async (requestId: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, COLLECTIONS.PAYMENT_REQUESTS, requestId);
        const requestDoc = await transaction.get(requestRef);
        
        if (!requestDoc.exists()) {
          throw new Error('Payment request not found');
        }

        const requestData = requestDoc.data();
        const paymentId = generateId('PY');

        const validationResult = validatePaymentRequestTransition(
          requestId,
          paymentId,
          'COMPLETED'
        );

        if (!validationResult.isValid) {
          throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
        }

        // Create payment
        const paymentRef = doc(collection(db, COLLECTIONS.PAYMENTS), paymentId);
        transaction.set(paymentRef, {
          id: paymentId,
          requestId,
          beneficiaryId: requestData.beneficiaryId,
          categoryId: requestData.treasuryId,
          amount: requestData.amount,
          date: requestData.startDate,
          paymentType: requestData.paymentType,
          notes: requestData.notes,
          description: requestData.description,
          status: 'COMPLETED',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });

        // Update request status
        transaction.update(requestRef, {
          status: 'COMPLETED',
          paymentId,
          updatedAt: Timestamp.now()
        });

        // Update treasury balance
        const categoryRef = doc(db, COLLECTIONS.TREASURY, requestData.treasuryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance;
        transaction.update(categoryRef, {
          balance: currentBalance - requestData.amount,
          updatedAt: Timestamp.now()
        });
      });

      return true;
    } catch (error) {
      console.error('Error completing payment request:', error);
      throw error;
    }
  },

  validateTransactionHistory: async () => {
    try {
      const [paymentsSnapshot, treasurySnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.PAYMENTS)),
        getDocs(collection(db, COLLECTIONS.TREASURY))
      ]);

      const transactions = paymentsSnapshot.docs.map(doc => ({
        sourceId: doc.data().categoryId,
        destinationId: doc.data().beneficiaryId,
        amount: doc.data().amount
      }));

      const balances = treasurySnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().balance;
        return acc;
      }, {} as Record<string, number>);

      const validationResult = validateBalances(transactions, balances);
      
      if (!validationResult.isValid) {
        console.error('Transaction history validation failed:', validationResult.errors);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating transaction history:', error);
      throw error;
    }
  }
};