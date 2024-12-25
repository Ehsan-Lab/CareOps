/**
 * @module TransactionService
 * @description Service for managing complex financial transactions and maintaining transaction history
 * Handles payment request lifecycle, transaction validation, and balance reconciliation
 */

import { 
  collection, 
  doc,
  getDocs, 
  Timestamp,
  query,
  limit,
  orderBy,
  startAfter,
  where,
  DocumentSnapshot,
  runTransaction,
  addDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLLECTIONS } from './constants';
import { Transaction } from '../../types';

const MAX_RETRY_ATTEMPTS = 3;
const BATCH_SIZE = 10;

/**
 * Implements exponential backoff for retrying operations
 * @param {number} attempt - Current attempt number
 * @returns {number} Delay in milliseconds
 */
const getRetryDelay = (attempt: number): number => {
  return Math.min(1000 * Math.pow(2, attempt), 10000);
};

/**
 * Retries an async operation with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {number} maxAttempts - Maximum number of retry attempts
 * @returns {Promise<T>} Result of the operation
 */
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));
      }
    }
  }
  
  throw lastError;
};

/**
 * @namespace transactionServices
 * @description Service object containing transaction operations
 */
export const transactionServices = {
  /**
   * Records a new transaction in the transactions collection
   * @async
   * @param {Object} data - Transaction data
   * @param {string} data.type - Type of transaction (CREDIT/DEBIT)
   * @param {number} data.amount - Transaction amount
   * @param {string} data.description - Transaction description
   * @param {string} data.category - Transaction category (e.g., DONATION, FEEDING_ROUND)
   * @param {string} data.reference - Reference ID (e.g., donation ID, feeding round ID)
   * @returns {Promise<string>} Created transaction ID
   */
  recordTransaction: async (data: {
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    category: string;
    reference: string;
  }) => {
    try {
      const transactionData = {
        ...data,
        date: new Date().toISOString(),
        status: 'COMPLETED',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), transactionData);
      return docRef.id;
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
  },

  /**
   * Retrieves transactions from the database with pagination
   * @async
   * @param {number} pageSize - Number of items per page
   * @param {DocumentSnapshot} [startAfterDoc] - Document to start after for pagination
   * @param {string} [type] - Optional type filter (CREDIT/DEBIT)
   * @returns {Promise<{transactions: Transaction[], lastDoc: DocumentSnapshot | null}>} Paginated transactions and last document
   * @throws {Error} If fetching transactions fails
   */
  getAll: async (pageSize: number = BATCH_SIZE, startAfterDoc?: DocumentSnapshot, type?: 'CREDIT' | 'DEBIT'): Promise<{
    transactions: Transaction[];
    lastDoc: DocumentSnapshot | null;
  }> => {
    try {
      let q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        orderBy('date', 'desc'),
        limit(pageSize)
      );

      if (type) {
        q = query(q, where('type', '==', type));
      }

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      const querySnapshot = await retryOperation(async () => await getDocs(q));
      
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];

      return {
        transactions,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
  }
};