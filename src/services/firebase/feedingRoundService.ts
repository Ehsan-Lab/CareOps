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
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FeedingRound } from '../../types';
import { COLLECTIONS } from './constants';

/**
 * @namespace feedingRoundServices
 * @description Service object containing feeding round operations and treasury management
 */
export const feedingRoundServices = {
  /**
   * Retrieves all feeding rounds from the database
   * @async
   * @returns {Promise<FeedingRound[]>} Array of feeding round objects
   * @throws {Error} If fetching rounds fails
   */
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.FEEDING_ROUNDS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedingRound[];
    } catch (error) {
      console.error('Error fetching feeding rounds:', error);
      throw error;
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
          createdAt: Timestamp.now()
        });

        transaction.update(categoryRef, {
          balance: currentBalance - data.allocatedAmount,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error creating feeding round:', error);
      throw error;
    }
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
    try {
      const docRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating feeding round:', error);
      throw error;
    }
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
    try {
      const docRef = doc(db, COLLECTIONS.FEEDING_ROUNDS, id);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating feeding round status:', error);
      throw error;
    }
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
      throw error;
    }
  }
}; 