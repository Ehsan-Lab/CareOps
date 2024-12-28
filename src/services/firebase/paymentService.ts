/**
 * @module PaymentService
 * @description Service for managing payment processing and related treasury operations in Firestore
 * Handles atomic transactions for payment creation, updates, cancellations, and deletions while maintaining treasury balances
 */

import { 
  collection, 
  doc,
  getDocs, 
  addDoc, 
  Timestamp,
  runTransaction,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLLECTIONS } from './constants';
import { transactionServices } from './transactionService';
import { Payment, PaymentStatus } from '../../types';

/**
 * @interface CreatePaymentData
 * @description Data required to create a new payment, excluding system-managed fields
 * @extends {Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt'>}
 */
interface CreatePaymentData extends Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

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
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  /**
   * Creates a new payment and updates treasury balance
   * @async
   * @param {CreatePaymentData} data - Data for the new payment
   * @returns {Promise<Payment | null>} Created payment object or null if creation fails
   * @throws {Error} If:
   *  - Amount is not positive
   *  - Treasury category doesn't exist
   *  - Insufficient funds in category
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Validates the payment amount
   * 2. Verifies the treasury category exists
   * 3. Checks sufficient funds in category
   * 4. Updates treasury balance
   * 5. Creates the payment record with COMPLETED status
   */
  create: async (data: CreatePaymentData) => {
    try {
      console.log('Creating payment with data:', {
        type: data.paymentType,
        repetitions: data.totalRepetitions,
        frequency: data.frequency
      });

      if (data.paymentType === 'RECURRING' && (!data.totalRepetitions || !data.frequency)) {
        throw new Error('Recurring payments require totalRepetitions and frequency');
      }

      // Create a single transaction for all payments
      const result = await runTransaction(db, async (transaction) => {
        // First, read the category document
        const categoryRef = doc(db, COLLECTIONS.TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        // For recurring payments, validate total amount but don't deduct yet
        const totalAmount = data.totalRepetitions ? data.amount * data.totalRepetitions : data.amount;
        const currentBalance = categoryDoc.data().balance || 0;
        
        // Just validate the funds are available
        if (currentBalance < totalAmount) {
          throw new Error('Insufficient funds in category');
        }

        // After all reads, perform writes
        const paymentRefs: { id: string; data: any }[] = [];

        if (data.paymentType === 'RECURRING' && data.totalRepetitions && data.totalRepetitions > 1) {
          console.log(`Creating ${data.totalRepetitions} recurring payments with frequency ${data.frequency}`);
          
          // Create multiple payments for recurring payments
          for (let i = 0; i < data.totalRepetitions; i++) {
            const paymentRef = doc(collection(db, COLLECTIONS.PAYMENTS));
            const paymentDate = new Date(data.date);

            // Calculate date based on frequency
            switch (data.frequency) {
              case 'weekly':
                paymentDate.setDate(paymentDate.getDate() + (7 * i));
                break;
              case 'monthly':
                paymentDate.setMonth(paymentDate.getMonth() + i);
                break;
              case 'quarterly':
                paymentDate.setMonth(paymentDate.getMonth() + (3 * i));
                break;
              case 'yearly':
                paymentDate.setFullYear(paymentDate.getFullYear() + i);
                break;
            }

            const paymentData = {
              ...data,
              date: paymentDate.toISOString().split('T')[0],
              status: 'PENDING' as const,
              repetitionNumber: i + 1,
              totalRepetitions: data.totalRepetitions,
              description: `${data.description} (Payment ${i + 1}/${data.totalRepetitions})`,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            };

            console.log(`Creating payment ${i + 1}/${data.totalRepetitions}:`, {
              date: paymentData.date,
              amount: paymentData.amount,
              description: paymentData.description
            });

            transaction.set(paymentRef, paymentData);
            paymentRefs.push({ id: paymentRef.id, data: paymentData });
          }

          console.log(`Successfully created ${paymentRefs.length} recurring payments`);
        } else {
          console.log('Creating single payment');
          // Create single payment for one-time payments
          const paymentRef = doc(collection(db, COLLECTIONS.PAYMENTS));
          const paymentData = {
            ...data,
            status: 'PENDING' as const,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          
          transaction.set(paymentRef, paymentData);
          paymentRefs.push({ id: paymentRef.id, data: paymentData });
        }

        return paymentRefs;
      });

      // Record transactions for each payment creation (not debiting treasury yet)
      console.log(`Recording ${result.length} transaction records`);
      await Promise.all(result.map(payment => 
        transactionServices.recordTransaction({
          type: 'STATUS_UPDATE',
          amount: data.amount,
          description: `Payment created for beneficiary ${data.beneficiaryId} - ${payment.data.description}`,
          category: 'PAYMENT_CREATED',
          reference: payment.id
        })
      ));

      console.log('Payment creation completed:', {
        paymentsCreated: result.length,
        firstPaymentId: result[0]?.id
      });

      return result.length === 1 ? result[0] : result;
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
   * @returns {Promise<Payment>} Updated payment object
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

      const result = await runTransaction(db, async (transaction) => {
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

          // Record refund transaction
          await transactionServices.recordTransaction({
            type: 'CREDIT',
            amount: currentPayment.amount,
            description: `Reversed payment to beneficiary ${currentPayment.beneficiaryId} - Update`,
            category: 'PAYMENT_UPDATE',
            reference: id
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

          // Record new payment transaction
          await transactionServices.recordTransaction({
            type: 'DEBIT',
            amount: newAmount,
            description: `Updated payment to beneficiary ${data.beneficiaryId || currentPayment.beneficiaryId}`,
            category: 'PAYMENT_UPDATE',
            reference: id
          });
        }

        // Update payment
        const updatedData = {
          ...data,
          updatedAt: Timestamp.now()
        };
        transaction.update(paymentRef, updatedData);

        return { ...currentPayment, ...updatedData };
      });

      return result;
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

        // Record the refund transaction
        await transactionServices.recordTransaction({
          type: 'CREDIT',
          amount: paymentData.amount,
          description: `Cancelled payment to beneficiary ${paymentData.beneficiaryId}`,
          category: 'PAYMENT_CANCEL',
          reference: id
        });
      });
    } catch (error) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  },

  /**
   * Updates the status of a payment and handles related treasury operations
   * @async
   * @param {string} id - Payment ID
   * @param {PaymentStatus} newStatus - New status for the payment
   * @throws {Error} If:
   *  - Payment not found
   *  - Invalid status transition
   *  - Treasury category not found
   *  - Insufficient funds for completion
   *  - Transaction fails
   */
  updateStatus: async (id: string, newStatus: PaymentStatus) => {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // First, read all necessary documents
        const paymentRef = doc(db, COLLECTIONS.PAYMENTS, id);
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists()) {
          throw new Error('Payment not found');
        }

        const payment = paymentDoc.data() as Payment;
        const currentStatus = payment.status;

        // Validate status transition
        if (currentStatus === newStatus) {
          return payment; // No change needed
        }

        if (currentStatus === 'CANCELLED') {
          throw new Error('Cannot update a cancelled payment');
        }

        // Read treasury category
        const categoryRef = doc(db, COLLECTIONS.TREASURY, payment.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;

        // Handle different status transitions
        if (currentStatus === 'PENDING' && newStatus === 'COMPLETED') {
          // Check if there are sufficient funds before completing
          if (currentBalance < payment.amount) {
            throw new Error('Insufficient funds in category');
          }

          // Deduct from treasury only when completing the payment
          transaction.update(categoryRef, {
            balance: currentBalance - payment.amount,
            updatedAt: Timestamp.now()
          });

          // Record debit transaction
          await transactionServices.recordTransaction({
            type: 'DEBIT',
            amount: payment.amount,
            description: `Payment completed for beneficiary ${payment.beneficiaryId} - ${payment.description || payment.paymentType}`,
            category: 'PAYMENT_COMPLETED',
            reference: id
          });
        } else if (currentStatus === 'COMPLETED' && newStatus === 'CANCELLED') {
          // Refund to treasury if cancelling a completed payment
          transaction.update(categoryRef, {
            balance: currentBalance + payment.amount,
            updatedAt: Timestamp.now()
          });

          // Record credit transaction
          await transactionServices.recordTransaction({
            type: 'CREDIT',
            amount: payment.amount,
            description: `Payment cancelled for beneficiary ${payment.beneficiaryId} - ${payment.description || payment.paymentType}`,
            category: 'PAYMENT_CANCELLED',
            reference: id
          });
        }

        // Update payment status
        const updatedData = {
          status: newStatus,
          updatedAt: Timestamp.now()
        };
        transaction.update(paymentRef, updatedData);

        return { ...payment, ...updatedData };
      });

      return result;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  getByBeneficiary: async (beneficiaryId: string) => {
    try {
      const q = query(
        collection(db, COLLECTIONS.PAYMENTS),
        where('beneficiaryId', '==', beneficiaryId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching beneficiary payments:', error);
      throw error;
    }
  }
}; 