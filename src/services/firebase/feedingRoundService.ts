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
import { format } from 'date-fns';
import { transactionServices } from '../../services/transactionService';

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
   * @returns {Promise<{rounds: FeedingRound[], lastDoc: DocumentSnapshot | null}>} Paginated feeding rounds and last document
   * @throws {Error} If fetching rounds fails
   */
  getAll: async (pageSize: number = BATCH_SIZE, startAfterDoc?: DocumentSnapshot, status?: string): Promise<{
    rounds: FeedingRound[];
    lastDoc: DocumentSnapshot | null;
  }> => {
    try {
      console.log('FeedingRoundService: Starting getAll with params:', { 
        pageSize, 
        hasStartAfterDoc: !!startAfterDoc, 
        status,
        collectionPath: COLLECTIONS.FEEDING_ROUNDS 
      });
      
      // Debug Firestore connection
      console.log('FeedingRoundService: Checking Firestore connection...', db);
      
      const collectionRef = collection(db, COLLECTIONS.FEEDING_ROUNDS);
      console.log('FeedingRoundService: Collection reference:', collectionRef);

      let q = query(
        collectionRef,
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      console.log('FeedingRoundService: Initial query created');

      if (status) {
        q = query(q, where('status', '==', status));
        console.log('FeedingRoundService: Added status filter:', status);
      }

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
        console.log('FeedingRoundService: Added pagination cursor');
      }

      console.log('FeedingRoundService: Executing query...');
      const querySnapshot = await retryOperation(async () => {
        console.log('FeedingRoundService: Attempting query execution...');
        const snapshot = await getDocs(q);
        console.log('FeedingRoundService: Query execution successful');
        return snapshot;
      });
      
      console.log('FeedingRoundService: Query returned', querySnapshot.docs.length, 'documents');
      console.log('FeedingRoundService: Documents:', querySnapshot.docs.map(doc => ({ id: doc.id, exists: doc.exists() })));
      
      const rounds = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('FeedingRoundService: Processing document:', { id: doc.id, data });
        
        return {
          id: doc.id,
          date: data.date || new Date().toISOString().split('T')[0],
          status: data.status || 'PENDING',
          allocatedAmount: data.allocatedAmount || 0,
          categoryId: data.categoryId || '',
          driveLink: data.driveLink || '',
          description: data.description || '',
          unitPrice: data.unitPrice || 0,
          observations: data.observations || '',
          specialCircumstances: data.specialCircumstances || '',
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now(),
          photos: data.photos || []
        };
      }) as FeedingRound[];

      console.log('FeedingRoundService: Processed rounds:', rounds.length);
      console.log('FeedingRoundService: Sample round data:', rounds[0]);
      
      const result = {
        rounds,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null
      };
      
      console.log('FeedingRoundService: Returning result:', {
        roundCount: result.rounds.length,
        hasLastDoc: !!result.lastDoc,
        sampleIds: result.rounds.slice(0, 3).map(r => r.id)
      });
      
      return result;
    } catch (error) {
      console.error('FeedingRoundService: Error in getAll:', error);
      console.error('FeedingRoundService: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
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
        const result = await runTransaction(db, async (transaction) => {
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
          const roundData = {
            ...data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          transaction.set(roundRef, roundData);

          transaction.update(categoryRef, {
            balance: currentBalance - data.allocatedAmount,
            updatedAt: Timestamp.now()
          });

          // Record the transaction inside the Firestore transaction
          const transactionRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
          const transactionData = {
            type: 'DEBIT',
            amount: data.allocatedAmount,
            description: `Feeding round allocation for ${format(new Date(data.date), 'MMM d, yyyy')}`,
            category: 'FEEDING_ROUND',
            reference: roundRef.id,
            status: 'COMPLETED',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          transaction.set(transactionRef, transactionData);

          return { id: roundRef.id, ...roundData };
        });

        return result;
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
        await runTransaction(db, async (transaction) => {
          const roundRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
          const roundDoc = await transaction.get(roundRef);
          
          if (!roundDoc.exists()) {
            throw new Error('Feeding round not found');
          }

          const roundData = roundDoc.data();
          transaction.update(roundRef, {
            status,
            updatedAt: Timestamp.now()
          });

          // Record status change transaction inside the Firestore transaction
          const transactionRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
          const transactionData = {
            type: 'STATUS_UPDATE',
            amount: roundData.allocatedAmount,
            description: `Feeding round status updated to ${status} for ${format(new Date(roundData.date), 'MMM d, yyyy')}`,
            category: 'FEEDING_ROUND_STATUS',
            reference: id,
            status: 'COMPLETED',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          };
          transaction.set(transactionRef, transactionData);
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
        let deletedRoundData: any;
        
        await runTransaction(db, async (transaction) => {
          const roundRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
          const roundDoc = await transaction.get(roundRef);
          
          if (!roundDoc.exists()) {
            throw new Error('Feeding round not found');
          }

          deletedRoundData = roundDoc.data();
          const categoryRef = doc(db, COLLECTIONS.TREASURY, deletedRoundData.categoryId);
          const categoryDoc = await transaction.get(categoryRef);
          
          if (!categoryDoc.exists()) {
            throw new Error('Feeding category not found');
          }

          const currentBalance = categoryDoc.data().balance || 0;

          // Record the refund transaction first
          const transactionRef = doc(collection(db, COLLECTIONS.TRANSACTIONS));
          const now = Timestamp.now();
          const transactionData = {
            type: 'CREDIT',
            amount: deletedRoundData.allocatedAmount,
            description: `Refund from deleted feeding round for ${format(new Date(deletedRoundData.date), 'MMM d, yyyy')}`,
            category: 'FEEDING_ROUND_DELETE',
            reference: id,
            status: 'COMPLETED',
            createdAt: now,
            updatedAt: now
          };
          transaction.set(transactionRef, transactionData);

          // Then update treasury and delete the round
          transaction.update(categoryRef, {
            balance: currentBalance + deletedRoundData.allocatedAmount,
            updatedAt: now
          });
          transaction.delete(roundRef);
        });

        // Log successful deletion and transaction recording
        console.log(`Successfully deleted feeding round ${id} and recorded refund transaction`);
        return deletedRoundData;
      } catch (error) {
        console.error('Error deleting feeding round:', error);
        throw new Error(`Failed to delete feeding round: ${error.message}`);
      }
    });
  }
}; 