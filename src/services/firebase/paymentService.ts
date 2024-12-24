/**
 * @module PaymentService
 * @description Service for managing payment processing and related treasury operations in Firestore
 * Handles atomic transactions for payment creation, updates, cancellations, and deletions while maintaining treasury balances
 */

import { 
  collection, 
  doc,
  getDocs, 
  updateDoc, 
  Timestamp,
  runTransaction,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Payment } from '../../types';
import { COLLECTIONS } from './constants';

/**
 * @interface CreatePaymentData
 * @description Data required to create a new payment, excluding system-managed fields
 * @extends {Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy' | 'isDeleted'>}
 */
interface CreatePaymentData extends Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deletedBy' | 'isDeleted'> {
  /** Flag indicating if the payment is created from a pending request (affects treasury balance check) */
  isFromPendingRequest?: boolean;
}

/**
 * @namespace paymentServices
 * @description Service object containing payment-related operations with treasury balance management
 */
export const paymentServices = {
  /**
   * Retrieves all non-deleted payments from the database
   * @async
   * @returns {Promise<Payment[]>} Array of active payment objects
   * @throws {Error} If fetching payments fails
   */
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.PAYMENTS),
          where('isDeleted', 'in', [false, null])
        )
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  /**
   * Creates a new payment and updates treasury balance if required
   * @async
   * @param {CreatePaymentData} data - Data for the new payment
   * @returns {Promise<Payment | null>} Created payment object or null if creation fails
   * @throws {Error} If:
   *  - Amount is not positive
   *  - Treasury category doesn't exist
   *  - Insufficient funds in category (for non-pending requests)
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Validates the payment amount
   * 2. Verifies the treasury category exists
   * 3. If not from pending request:
   *    a. Checks sufficient funds in category
   *    b. Updates treasury balance
   * 4. Creates the payment record with COMPLETED status
   */
  create: async (data: CreatePaymentData) => {
    try {
      if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      let createdPayment: Payment | null = null;

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
        const paymentData = {
          ...data,
          id: paymentRef.id,
          status: 'COMPLETED',
          isDeleted: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        transaction.set(paymentRef, paymentData);
        createdPayment = paymentData as Payment;
      });

      return createdPayment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  /**
   * Updates a payment and adjusts treasury balances if amount or category changes
   * @async
   * @param {string} id - Payment ID
   * @param {Partial<Payment>} data - Updated payment data
   * @throws {Error} If:
   *  - Payment not found
   *  - New amount is not positive
   *  - Original/new treasury category not found
   *  - Insufficient funds in new category
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically when amount or category changes:
   * 1. Validates the new amount if provided
   * 2. Retrieves and validates the original payment
   * 3. If amount/category changed:
   *    a. Returns original amount to original category
   *    b. Checks sufficient funds in new category
   *    c. Deducts new amount from new category
   * 4. Updates the payment record
   */
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

  /**
   * Cancels a payment and refunds the amount to treasury
   * @async
   * @param {string} id - Payment ID
   * @throws {Error} If:
   *  - Payment not found
   *  - Payment already cancelled
   *  - Treasury category not found
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Retrieves and validates the payment
   * 2. Verifies payment is not already cancelled
   * 3. Updates payment status to CANCELLED
   * 4. Refunds the amount to treasury category
   */
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
  },

  /**
   * Soft deletes a payment and refunds the amount to treasury if completed
   * @async
   * @param {string} id - Payment ID
   * @param {string} userId - ID of user performing the deletion
   * @throws {Error} If:
   *  - Payment not found
   *  - Payment already deleted
   *  - Payment is cancelled
   *  - Treasury category not found
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Retrieves and validates the payment
   * 2. Verifies payment can be deleted
   * 3. If payment was COMPLETED:
   *    a. Refunds amount to treasury category
   * 4. Soft deletes the payment with audit trail
   */
  delete: async (id: string, userId: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, COLLECTIONS.PAYMENTS, id);
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists()) {
          throw new Error('Payment not found');
        }

        const paymentData = paymentDoc.data() as Payment;
        
        // Validate payment can be deleted
        if (paymentData.isDeleted) {
          throw new Error('Payment already deleted');
        }
        
        if (paymentData.status === 'CANCELLED') {
          throw new Error('Cannot delete cancelled payments');
        }

        // If payment was deducted from treasury (COMPLETED status), refund it
        if (paymentData.status === 'COMPLETED') {
          const categoryRef = doc(db, COLLECTIONS.TREASURY, paymentData.categoryId);
          const categoryDoc = await transaction.get(categoryRef);
          
          if (!categoryDoc.exists()) {
            throw new Error('Treasury category not found');
          }

          const currentBalance = categoryDoc.data().balance || 0;

          // Refund amount to treasury
          transaction.update(categoryRef, {
            balance: currentBalance + paymentData.amount,
            updatedAt: Timestamp.now()
          });
        }

        // Soft delete the payment
        transaction.update(paymentRef, {
          isDeleted: true,
          deletedAt: Timestamp.now(),
          deletedBy: userId,
          status: 'CANCELLED',
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }
}; 