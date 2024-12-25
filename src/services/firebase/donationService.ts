/**
 * @module DonationService
 * @description Service for managing donation data and related treasury operations in Firestore
 * Handles atomic transactions for donation creation, updates, and deletions while maintaining treasury balances
 */

import { 
  collection, 
  doc,
  getDocs, 
  addDoc, 
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLLECTIONS } from './constants';
import { transactionServices } from './transactionService';

/**
 * @interface CreateDonationData
 * @description Data required to create a new donation
 */
interface CreateDonationData {
  /** ID of the donor making the donation */
  donorId: string;
  /** Amount being donated (must be positive) */
  amount: number;
  /** Purpose or intended use of the donation */
  purpose: string;
  /** ID of the treasury category to receive the funds */
  categoryId: string;
  /** Date when the donation was made */
  date: string;
}

/**
 * @namespace donationServices
 * @description Service object containing donation-related operations with treasury balance management
 */
export const donationServices = {
  /**
   * Retrieves all donations from the database
   * @async
   * @returns {Promise<Donation[]>} Array of donation objects
   * @throws {Error} If fetching donations fails
   */
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.DONATIONS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching donations:', error);
      throw error;
    }
  },

  /**
   * Creates a new donation and updates the corresponding treasury balance in a single transaction
   * @async
   * @param {CreateDonationData} data - Data for the new donation
   * @throws {Error} If:
   *  - Amount is not positive
   *  - Treasury category doesn't exist
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Validates the donation amount
   * 2. Verifies the treasury category exists
   * 3. Creates the donation record
   * 4. Updates the treasury category balance
   */
  create: async (data: any) => {
    try {
      const result = await runTransaction(db, async (transaction) => {
        // Create the donation
        const donationRef = doc(collection(db, COLLECTIONS.DONATIONS));
        const donationData = {
          ...data,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        transaction.set(donationRef, donationData);

        // Update treasury balance
        const categoryRef = doc(db, COLLECTIONS.TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        transaction.update(categoryRef, {
          balance: currentBalance + data.amount,
          updatedAt: Timestamp.now()
        });

        return { id: donationRef.id, ...donationData };
      });

      // Record the transaction
      await transactionServices.recordTransaction({
        type: 'CREDIT',
        amount: data.amount,
        description: `Donation from ${data.donorName || 'Anonymous'}`,
        category: 'DONATION',
        reference: result.id
      });

      return result;
    } catch (error) {
      console.error('Error creating donation:', error);
      throw error;
    }
  },

  /**
   * Updates a donation and adjusts treasury balances if amount or category changes
   * @async
   * @param {string} id - Donation ID
   * @param {Partial<Donation>} data - Updated donation data
   * @throws {Error} If:
   *  - Donation not found
   *  - New amount is not positive
   *  - Original/new treasury category not found
   *  - Original category has insufficient balance
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically when amount or category changes:
   * 1. Validates the new amount if provided
   * 2. Retrieves and validates the original donation
   * 3. If amount/category changed:
   *    a. Subtracts original amount from original category
   *    b. Adds new amount to new/current category
   * 4. Updates the donation record
   */
  update: async (id: string, data: Partial<Donation>) => {
    try {
      if (data.amount !== undefined && data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      await runTransaction(db, async (transaction) => {
        const donationRef = doc(db, COLLECTIONS.DONATIONS, id);
        const donationDoc = await transaction.get(donationRef);
        
        if (!donationDoc.exists()) {
          throw new Error('Donation not found');
        }

        const currentDonation = donationDoc.data() as Donation;

        // If amount or category is changing, we need to adjust treasury balances
        if (data.amount !== undefined || data.categoryId !== undefined) {
          // Subtract amount from original category
          const originalCategoryRef = doc(db, COLLECTIONS.TREASURY, currentDonation.categoryId);
          const originalCategoryDoc = await transaction.get(originalCategoryRef);
          
          if (!originalCategoryDoc.exists()) {
            throw new Error('Original treasury category not found');
          }

          const originalBalance = originalCategoryDoc.data().balance || 0;
          if (originalBalance < currentDonation.amount) {
            throw new Error('Cannot update: original category has insufficient balance');
          }

          transaction.update(originalCategoryRef, {
            balance: originalBalance - currentDonation.amount,
            updatedAt: Timestamp.now()
          });

          // Add to new/current category
          const newCategoryId = data.categoryId || currentDonation.categoryId;
          const newCategoryRef = doc(db, COLLECTIONS.TREASURY, newCategoryId);
          const newCategoryDoc = await transaction.get(newCategoryRef);
          
          if (!newCategoryDoc.exists()) {
            throw new Error('New treasury category not found');
          }

          const newAmount = data.amount || currentDonation.amount;
          transaction.update(newCategoryRef, {
            balance: (newCategoryDoc.data().balance || 0) + newAmount,
            updatedAt: Timestamp.now()
          });
        }

        // Update donation
        transaction.update(donationRef, {
          ...data,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error updating donation:', error);
      throw error;
    }
  },

  /**
   * Deletes a donation and adjusts the corresponding treasury balance
   * @async
   * @param {string} id - Donation ID
   * @throws {Error} If:
   *  - Donation not found
   *  - Treasury category not found
   *  - Category has insufficient balance
   *  - Transaction fails
   * 
   * @description
   * This operation performs the following steps atomically:
   * 1. Retrieves and validates the donation
   * 2. Verifies the treasury category exists and has sufficient balance
   * 3. Updates the treasury category balance
   * 4. Deletes the donation record
   */
  delete: async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const donationRef = doc(db, COLLECTIONS.DONATIONS, id);
        const donationDoc = await transaction.get(donationRef);
        
        if (!donationDoc.exists()) {
          throw new Error('Donation not found');
        }

        const donationData = donationDoc.data() as Donation;

        // Subtract amount from category
        const categoryRef = doc(db, COLLECTIONS.TREASURY, donationData.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        if (currentBalance < donationData.amount) {
          throw new Error('Cannot delete: category has insufficient balance');
        }

        // Update treasury balance
        transaction.update(categoryRef, {
          balance: currentBalance - donationData.amount,
          updatedAt: Timestamp.now()
        });

        // Delete donation
        transaction.delete(donationRef);
      });
    } catch (error) {
      console.error('Error deleting donation:', error);
      throw error;
    }
  }
}; 