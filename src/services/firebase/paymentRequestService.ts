import { 
  collection, 
  doc,
  getDocs, 
  updateDoc, 
  Timestamp,
  runTransaction,
  query,
  where,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PaymentRequest, PaymentRequestStatus } from '../../types/paymentRequest';
import { COLLECTIONS } from './constants';
import { paymentServices } from './paymentService';

const PAYMENT_REQUESTS = 'paymentRequests';

export const paymentRequestServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, PAYMENT_REQUESTS),
          orderBy('startDate', 'desc')
        )
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentRequest[];
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      throw error;
    }
  },

  create: async (data: Omit<PaymentRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PaymentRequest> => {
    try {
      let createdRequestId: string;

      await runTransaction(db, async (transaction) => {
        // Validate treasury balance
        const categoryRef = doc(db, COLLECTIONS.TREASURY, data.treasuryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        // Create payment request
        const requestRef = doc(collection(db, PAYMENT_REQUESTS));
        createdRequestId = requestRef.id;

        const requestData = {
          ...data,
          id: createdRequestId,
          status: 'CREATED' as PaymentRequestStatus,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        transaction.set(requestRef, requestData);
      });

      // Fetch and return the created request
      const requestDoc = await getDoc(doc(db, PAYMENT_REQUESTS, createdRequestId!));
      if (!requestDoc.exists()) {
        throw new Error('Failed to fetch created request');
      }

      return {
        id: requestDoc.id,
        ...requestDoc.data()
      } as PaymentRequest;
    } catch (error) {
      console.error('Error creating payment request:', error);
      throw error;
    }
  },

  updateStatus: async (id: string, status: PaymentRequestStatus) => {
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, PAYMENT_REQUESTS, id);
        const requestDoc = await transaction.get(requestRef);
        
        if (!requestDoc.exists()) {
          throw new Error('Payment request not found');
        }

        const requestData = requestDoc.data() as PaymentRequest;
        
        // Validate status transition
        if (!isValidStatusTransition(requestData.status, status)) {
          throw new Error('Invalid status transition');
        }

        // For PENDING status, validate date and reserve amount
        if (status === 'PENDING') {
          const startDate = new Date(requestData.startDate);
          const currentDate = new Date();
          const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          
          if (startDate < firstDayOfMonth) {
            throw new Error('Cannot set Pending status for past months');
          }

          // Reserve amount in treasury
          const categoryRef = doc(db, COLLECTIONS.TREASURY, requestData.treasuryId);
          const categoryDoc = await transaction.get(categoryRef);
          
          if (!categoryDoc.exists()) {
            throw new Error('Treasury category not found');
          }

          const currentBalance = categoryDoc.data().balance || 0;
          if (currentBalance < requestData.amount) {
            throw new Error('Insufficient funds in treasury');
          }

          transaction.update(categoryRef, {
            balance: currentBalance - requestData.amount,
            updatedAt: Timestamp.now()
          });
        }

        // If status is COMPLETED, create a payment
        if (status === 'COMPLETED') {
          await paymentServices.create({
            beneficiaryId: requestData.beneficiaryId,
            categoryId: requestData.treasuryId,
            amount: requestData.amount,
            date: requestData.startDate,
            paymentType: requestData.paymentType,
            notes: requestData.notes,
            description: requestData.description,
            representativeId: 'SYSTEM'
          });
        }

        // Update request status
        transaction.update(requestRef, {
          status,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error updating payment request status:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<PaymentRequest>): Promise<PaymentRequest> => {
    try {
      const docRef = doc(db, PAYMENT_REQUESTS, id);
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);

      // Fetch and return the updated request
      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error('Failed to fetch updated request');
      }

      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as PaymentRequest;
    } catch (error) {
      console.error('Error updating payment request:', error);
      throw error;
    }
  },

  bulkUpdateStatus: async (ids: string[], status: PaymentRequestStatus) => {
    try {
      await Promise.all(
        ids.map(id => paymentRequestServices.updateStatus(id, status))
      );
    } catch (error) {
      console.error('Error updating payment request statuses:', error);
      throw error;
    }
  }
};

function isValidStatusTransition(currentStatus: PaymentRequestStatus, newStatus: PaymentRequestStatus): boolean {
  const validTransitions: Record<PaymentRequestStatus, PaymentRequestStatus[]> = {
    'CREATED': ['PENDING'],
    'PENDING': ['COMPLETED'],
    'COMPLETED': []
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}