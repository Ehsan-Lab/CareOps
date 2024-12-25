/**
 * @module FeedingRoundService
 * @description Service for managing feeding round events and related treasury operations in Firestore
 * Handles the lifecycle of feeding events including creation, status management, and treasury balance adjustments
 */

import { 
  collection, 
  doc,
  getDocs, 
  updateDoc, 
  Timestamp,
  runTransaction,
  query,
  limit,
  orderBy,
  startAfter,
  writeBatch,
  where,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FeedingRound } from '../../types';
import { COLLECTIONS } from './constants';

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
 * @namespace feedingRoundServices
 * @description Service object containing feeding round operations and treasury management
 */
export const feedingRoundServices = {
  /**
   * Retrieves feeding rounds from the database with pagination
   * @async
   * @param {number} pageSize - Number of items per page
   * @param {DocumentSnapshot} [startAfterDoc] - Document to start after for pagination
   * @param {string} [status] - Optional status filter
   * @returns {Promise<{rounds: FeedingRound[], lastDoc: DocumentSnapshot}>} Paginated feeding rounds and last document
   * @throws {Error} If fetching rounds fails
   */
  getAll: async (pageSize: number = BATCH_SIZE, startAfterDoc?: DocumentSnapshot, status?: string) => {
    try {
      let q = query(
        collection(db, COLLECTIONS.FEEDING_ROUNDS),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      const querySnapshot = await retryOperation(async () => await getDocs(q));
      
      const rounds = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedingRound[];

      return {
        rounds,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error fetching feeding rounds:', error);
      throw new Error(`Failed to fetch feeding rounds: ${error.message}`);
    }
  },

  /**
   * Creates a new feeding round and allocates funds from treasury
   * @async
   * @param {Omit<FeedingRound, 'id'>} data - Feeding round data without ID
   * @throws {Error} If:
   *  - Feeding category not found
   *  - Insufficient funds in category
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Verifies the feeding category exists
   * 2. Checks sufficient funds are available
   * 3. Creates the feeding round record
   * 4. Deducts allocated amount from treasury category
   */
  create: async (data: Omit<FeedingRound, 'id'>) => {
    return retryOperation(async () => {
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
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          transaction.update(categoryRef, {
            balance: currentBalance - data.allocatedAmount,
            updatedAt: Timestamp.now()
          });

          return { id: roundRef.id, ...data };
        });
      } catch (error) {
        console.error('Error creating feeding round:', error);
        throw new Error(`Failed to create feeding round: ${error.message}`);
      }
    });
  },

  /**
   * Updates multiple feeding rounds in a batch
   * @async
   * @param {Array<{id: string, data: Partial<FeedingRound>}>} updates - Array of updates
   * @throws {Error} If batch update fails
   */
  batchUpdate: async (updates: { id: string; data: Partial<FeedingRound> }[]) => {
    return retryOperation(async () => {
      try {
        const batch = writeBatch(db);
        
        updates.forEach(({ id, data }) => {
          const docRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
          batch.update(docRef, {
            ...data,
            updatedAt: Timestamp.now()
          });
        });

        await batch.commit();
      } catch (error) {
        console.error('Error batch updating feeding rounds:', error);
        throw new Error(`Failed to update feeding rounds: ${error.message}`);
      }
    });
  },

  /**
   * Updates a feeding round's information
   * @async
   * @param {string} id - Feeding round ID
   * @param {Partial<FeedingRound>} data - Updated feeding round data
   * @throws {Error} If updating the round fails
   * 
   * @description
   * Updates the feeding round details while maintaining the allocated amount.
   * For changes to allocated amount, the round should be deleted and recreated.
   */
  update: async (id: string, data: Partial<FeedingRound>) => {
    return retryOperation(async () => {
      try {
        const docRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
        await updateDoc(docRef, {
          ...data,
          updatedAt: Timestamp.now()
        });
      } catch (error) {
        console.error('Error updating feeding round:', error);
        throw new Error(`Failed to update feeding round: ${error.message}`);
      }
    });
  },

  /**
   * Updates the status of a feeding round
   * @async
   * @param {string} id - Feeding round ID
   * @param {'PENDING' | 'IN_PROGRESS' | 'COMPLETED'} status - New status
   * @throws {Error} If updating the status fails
   * 
   * @description
   * Updates the feeding round status to track its progress.
   * Status transitions: PENDING → IN_PROGRESS → COMPLETED
   */
  updateStatus: async (id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    return retryOperation(async () => {
      try {
        const docRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
        await updateDoc(docRef, {
          status,
          updatedAt: Timestamp.now()
        });
      } catch (error) {
        console.error('Error updating feeding round status:', error);
        throw new Error(`Failed to update feeding round status: ${error.message}`);
      }
    });
  },

  /**
   * Deletes a feeding round and refunds allocated amount to treasury
   * @async
   * @param {string} id - Feeding round ID
   * @throws {Error} If:
   *  - Feeding round not found
   *  - Feeding category not found
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Retrieves and validates the feeding round
   * 2. Verifies the treasury category exists
   * 3. Deletes the feeding round record
   * 4. Refunds the allocated amount to treasury category
   */
  delete: async (id: string) => {
    return retryOperation(async () => {
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
        throw new Error(`Failed to delete feeding round: ${error.message}`);
      }
    });
  }
}; 