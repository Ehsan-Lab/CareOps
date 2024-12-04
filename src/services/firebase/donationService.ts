import { 
  collection, 
  doc,
  getDocs, 
  Timestamp,
  runTransaction,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Donation } from '../../types';
import { COLLECTIONS } from './constants';

interface CreateDonationData {
  donorId: string;
  amount: number;
  purpose: string;
  categoryId: string;
  date: string;
}

export const donationServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.DONATIONS),
          where('isDeleted', 'in', [false, null])
        )
      );
      const donations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Fetched donations:', donations);
      return donations as Donation[];
    } catch (error) {
      console.error('Error fetching donations:', error);
      throw error;
    }
  },

  create: async (data: CreateDonationData) => {
    try {
      if (data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      let createdDonation: Donation | null = null;

      await runTransaction(db, async (transaction) => {
        console.log('Starting donation creation transaction...');
        
        // First, do all reads
        const categoryRef = doc(db, COLLECTIONS.TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        console.log('Current treasury balance:', currentBalance);

        // Then, do all writes
        // 1. Create donation
        const donationRef = doc(collection(db, COLLECTIONS.DONATIONS));
        const donationData = {
          id: donationRef.id,
          donorId: data.donorId,
          amount: data.amount,
          purpose: data.purpose,
          categoryId: data.categoryId,
          date: data.date,
          isDeleted: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        console.log('Creating donation:', donationData);
        transaction.set(donationRef, donationData);
        createdDonation = donationData as unknown as Donation;

        // 2. Update treasury balance
        const newBalance = currentBalance + data.amount;
        console.log('New treasury balance will be:', newBalance);
        
        transaction.update(categoryRef, {
          balance: newBalance,
          updatedAt: Timestamp.now()
        });

        console.log('Transaction completed successfully');
      });

      return createdDonation;
    } catch (error) {
      console.error('Error creating donation:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Donation>) => {
    try {
      if (data.amount !== undefined && data.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      await runTransaction(db, async (transaction) => {
        console.log('Starting donation update transaction...');
        
        const donationRef = doc(db, COLLECTIONS.DONATIONS, id);
        const donationDoc = await transaction.get(donationRef);
        
        if (!donationDoc.exists()) {
          throw new Error('Donation not found');
        }

        const currentDonation = donationDoc.data() as unknown as Donation;
        if (currentDonation.isDeleted) {
          throw new Error('Cannot update deleted donation');
        }

        // If amount or category is changing, we need to adjust treasury balances
        if (data.amount !== undefined || data.categoryId !== undefined) {
          console.log('Amount or category is changing, adjusting treasury balances...');
          
          // Subtract amount from original category
          const originalCategoryRef = doc(db, COLLECTIONS.TREASURY, currentDonation.categoryId);
          const originalCategoryDoc = await transaction.get(originalCategoryRef);
          
          if (!originalCategoryDoc.exists()) {
            throw new Error('Original treasury category not found');
          }

          const originalBalance = originalCategoryDoc.data().balance || 0;
          console.log('Original category balance:', originalBalance);
          console.log('Subtracting original amount:', currentDonation.amount);

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
          const newBalance = (newCategoryDoc.data().balance || 0) + newAmount;
          console.log('New category balance will be:', newBalance);

          transaction.update(newCategoryRef, {
            balance: newBalance,
            updatedAt: Timestamp.now()
          });
        }

        // Update donation
        transaction.update(donationRef, {
          ...data,
          updatedAt: Timestamp.now()
        });

        console.log('Transaction completed successfully');
      });
    } catch (error) {
      console.error('Error updating donation:', error);
      throw error;
    }
  },

  delete: async (id: string, userId: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        console.log('Starting donation deletion transaction...');
        
        const donationRef = doc(db, COLLECTIONS.DONATIONS, id);
        const donationDoc = await transaction.get(donationRef);
        
        if (!donationDoc.exists()) {
          throw new Error('Donation not found');
        }

        const donationData = donationDoc.data() as unknown as Donation;
        if (donationData.isDeleted) {
          throw new Error('Donation already deleted');
        }

        // Subtract amount from category
        const categoryRef = doc(db, COLLECTIONS.TREASURY, donationData.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        console.log('Current treasury balance:', currentBalance);
        console.log('Subtracting donation amount:', donationData.amount);

        if (currentBalance < donationData.amount) {
          throw new Error('Cannot delete: category has insufficient balance');
        }

        const newBalance = currentBalance - donationData.amount;
        console.log('New treasury balance will be:', newBalance);

        // Update treasury balance
        transaction.update(categoryRef, {
          balance: newBalance,
          updatedAt: Timestamp.now()
        });

        // Soft delete the donation
        transaction.update(donationRef, {
          isDeleted: true,
          deletedAt: Timestamp.now(),
          deletedBy: userId,
          updatedAt: Timestamp.now()
        });

        console.log('Transaction completed successfully');
      });
    } catch (error) {
      console.error('Error deleting donation:', error);
      throw error;
    }
  }
}; 