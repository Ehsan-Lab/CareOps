/**
 * @module PaymentRequestService
 * @description Service for managing payment request workflow and related treasury operations in Firestore
 * Handles the lifecycle of payment requests including creation, status transitions, and treasury balance management
 */

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
  getDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PaymentRequest, PaymentRequestStatus } from '../../types/paymentRequest';
import { COLLECTIONS } from './constants';
import { paymentServices } from './paymentService';

/** Collection name for payment requests */
const PAYMENT_REQUESTS = 'paymentRequests';

/**
 * @namespace paymentRequestServices
 * @description Service object containing payment request operations and workflow management
 */
export const paymentRequestServices = {
  /**
   * Retrieves all payment requests ordered by start date
   * @async
   * @returns {Promise<PaymentRequest[]>} Array of payment request objects
   * @throws {Error} If fetching requests fails
   */
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

  /**
   * Creates a new payment request with initial CREATED status
   * @async
   * @param {Omit<PaymentRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>} data - Payment request data
   * @returns {Promise<PaymentRequest>} Created payment request object
   * @throws {Error} If:
   *  - Amount is not positive
   *  - Treasury category doesn't exist
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Validates the request amount
   * 2. Verifies the treasury category exists
   * 3. Creates the request with CREATED status
   * Note: No funds are reserved at this stage
   */
  create: async (data: Omit<PaymentRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PaymentRequest> => {
    try {
      if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

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

  /**
   * Updates the status of a payment request and handles related treasury operations
   * @async
   * @param {string} id - Payment request ID
   * @param {PaymentRequestStatus} status - New status to set
   * @throws {Error} If:
   *  - Request not found
   *  - Invalid status transition
   *  - Treasury category not found
   *  - Insufficient funds
   *  - Past date for PENDING status
   *  - Transaction fails
   * 
   * @description
   * This operation handles different status transitions with specific rules:
   * 
   * CREATED → PENDING:
   * 1. Validates start date is not in past months
   * 2. Checks sufficient funds in treasury
   * 3. Reserves amount by deducting from treasury
   * 
   * CREATED → COMPLETED:
   * 1. Checks sufficient funds in treasury
   * 2. Creates payment and deducts amount
   * 
   * PENDING → COMPLETED:
   * 1. Creates payment (amount already reserved)
   * 2. Uses isFromPendingRequest flag to prevent double deduction
   */
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

        // Handle treasury balance based on status changes
        const categoryRef = doc(db, COLLECTIONS.TREASURY, requestData.treasuryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;

        // Handle different status transitions
        switch (status) {
          case 'PENDING':
            // Validate date
            const startDate = new Date(requestData.startDate);
            const currentDate = new Date();
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            
            if (startDate < firstDayOfMonth) {
              throw new Error('Cannot set Pending status for past months');
            }

            // Check and reserve funds
            if (currentBalance < requestData.amount) {
              throw new Error('Insufficient funds in treasury');
            }

            // Reserve amount
            transaction.update(categoryRef, {
              balance: currentBalance - requestData.amount,
              updatedAt: Timestamp.now()
            });
            break;

          case 'COMPLETED':
            // If coming from CREATED, deduct from treasury and create payment
            if (requestData.status === 'CREATED') {
              if (currentBalance < requestData.amount) {
                throw new Error('Insufficient funds in treasury');
              }
              
              // Create payment first
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
            // If coming from PENDING, just create payment (amount already reserved)
            else if (requestData.status === 'PENDING') {
              await paymentServices.create({
                beneficiaryId: requestData.beneficiaryId,
                categoryId: requestData.treasuryId,
                amount: requestData.amount,
                date: requestData.startDate,
                paymentType: requestData.paymentType,
                notes: requestData.notes,
                description: requestData.description,
                representativeId: 'SYSTEM',
                isFromPendingRequest: true // Flag to prevent double deduction
              });
            }
            break;
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

  /**
   * Updates a payment request and adjusts treasury balances if needed
   * @async
   * @param {string} id - Payment request ID
   * @param {Partial<PaymentRequest>} data - Updated request data
   * @returns {Promise<PaymentRequest>} Updated payment request object
   * @throws {Error} If:
   *  - Request not found
   *  - New amount is not positive
   *  - Treasury category not found
   *  - Insufficient funds in new category
   *  - Transaction fails
   * 
   * @description
   * This operation handles treasury balance adjustments for PENDING requests:
   * 1. Returns reserved amount to current category
   * 2. If changing category:
   *    a. Verifies new category exists
   *    b. Checks sufficient funds in new category
   * 3. Reserves new amount from target category
   * 4. Updates the request record
   */
  update: async (id: string, data: Partial<PaymentRequest>): Promise<PaymentRequest> => {
    try {
      if (data.amount !== undefined && data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, PAYMENT_REQUESTS, id);
        const requestDoc = await transaction.get(docRef);
        
        if (!requestDoc.exists()) {
          throw new Error('Payment request not found');
        }

        const currentRequest = requestDoc.data() as PaymentRequest;

        // If amount or category is changing and status is PENDING, we need to adjust treasury
        if (currentRequest.status === 'PENDING' && 
            (data.amount !== undefined || data.treasuryId !== undefined)) {
          
          // Get current category balance
          const currentCategoryRef = doc(db, COLLECTIONS.TREASURY, currentRequest.treasuryId);
          const currentCategoryDoc = await transaction.get(currentCategoryRef);
          
          if (!currentCategoryDoc.exists()) {
            throw new Error('Current treasury category not found');
          }

          // Return reserved amount to current category
          transaction.update(currentCategoryRef, {
            balance: (currentCategoryDoc.data().balance || 0) + currentRequest.amount,
            updatedAt: Timestamp.now()
          });

          // If changing category, get new category balance
          const newCategoryId = data.treasuryId || currentRequest.treasuryId;
          const newCategoryRef = doc(db, COLLECTIONS.TREASURY, newCategoryId);
          const newCategoryDoc = await transaction.get(newCategoryRef);
          
          if (!newCategoryDoc.exists()) {
            throw new Error('New treasury category not found');
          }

          // Reserve amount from new category
          const newAmount = data.amount || currentRequest.amount;
          const newBalance = newCategoryDoc.data().balance || 0;
          
          if (newBalance < newAmount) {
            throw new Error('Insufficient funds in new category');
          }

          transaction.update(newCategoryRef, {
            balance: newBalance - newAmount,
            updatedAt: Timestamp.now()
          });
        }

        // Update request
        const updateData = {
          ...data,
          updatedAt: Timestamp.now()
        };
        transaction.update(docRef, updateData);
      });

      // Fetch and return updated request
      const updatedDoc = await getDoc(doc(db, PAYMENT_REQUESTS, id));
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as PaymentRequest;
    } catch (error) {
      console.error('Error updating payment request:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, PAYMENT_REQUESTS, id);
        const requestDoc = await transaction.get(requestRef);
        
        if (!requestDoc.exists()) {
          throw new Error('Payment request not found');
        }

        const requestData = requestDoc.data() as PaymentRequest;

        // If status is PENDING, return reserved amount to treasury
        if (requestData.status === 'PENDING') {
          const categoryRef = doc(db, COLLECTIONS.TREASURY, requestData.treasuryId);
          const categoryDoc = await transaction.get(categoryRef);
          
          if (!categoryDoc.exists()) {
            throw new Error('Treasury category not found');
          }

          transaction.update(categoryRef, {
            balance: (categoryDoc.data().balance || 0) + requestData.amount,
            updatedAt: Timestamp.now()
          });
        }

        transaction.delete(requestRef);
      });
    } catch (error) {
      console.error('Error deleting payment request:', error);
      throw error;
    }
  }
};

/**
 * Validates if a status transition is allowed
 * @private
 * @param {PaymentRequestStatus} currentStatus - Current status of the request
 * @param {PaymentRequestStatus} newStatus - Desired new status
 * @returns {boolean} Whether the transition is valid
 */
function isValidStatusTransition(currentStatus: PaymentRequestStatus, newStatus: PaymentRequestStatus): boolean {
  const allowedTransitions: Record<PaymentRequestStatus, PaymentRequestStatus[]> = {
    'CREATED': ['PENDING', 'COMPLETED'],
    'PENDING': ['COMPLETED'],
    'COMPLETED': []
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}