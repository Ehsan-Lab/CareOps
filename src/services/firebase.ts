import { 
  collection, 
  doc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Donor, Donation, FeedingRound, TreasuryCategory } from '../types';

// Collection references
const DONORS = 'donors';
const DONATIONS = 'donations';
const FEEDING_ROUNDS = 'feedingRounds';
const TREASURY = 'treasury';

// Donor Services
export const donorServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, DONORS));
      const donors = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Donor[];
      console.log('Raw donors data:', donors);
      return donors;
    } catch (error) {
      console.error('Firebase operation failed:', error);
      throw error;
    }
  },
  
  create: async (data: Omit<Donor, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, DONORS), {
        name: data.name,
        contact: data.contact,
        createdAt: Timestamp.now()
      });
      return docRef;
    } catch (error) {
      console.error('Error saving donor:', error);
      throw error;
    }
  },
  
  update: async (id: string, data: Partial<Donor>) => {
    try {
      const docRef = doc(db, DONORS, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating donor:', error);
      throw error;
    }
  },
  
  delete: async (id: string) => {
    try {
      const docRef = doc(db, DONORS, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting donor:', error);
      throw error;
    }
  }
};

// Donation Services
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
      const querySnapshot = await getDocs(collection(db, DONATIONS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching donations:', error);
      throw error;
    }
  },

  create: async (data: CreateDonationData) => {
    try {
      await runTransaction(db, async (transaction) => {
        // First, do all reads
        const categoryRef = doc(db, TREASURY, String(data.categoryId));
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;

        // Then, do all writes
        // 1. Create donation
        const donationRef = doc(collection(db, DONATIONS));
        transaction.set(donationRef, {
          donorId: String(data.donorId),
          amount: Number(data.amount),
          purpose: data.purpose,
          categoryId: String(data.categoryId),
          date: data.date,
          createdAt: Timestamp.now()
        });

        // 2. Update treasury balance
        transaction.update(categoryRef, {
          balance: currentBalance + Number(data.amount),
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error creating donation:', error);
      throw error;
    }
  }
};

// Feeding Round Services
export const feedingRoundServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, FEEDING_ROUNDS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching feeding rounds:', error);
      throw error;
    }
  },

  create: async (data: Omit<FeedingRound, 'id'>) => {
    try {
      await runTransaction(db, async (transaction) => {
        // First, do all reads
        const categoryRef = doc(db, TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Feeding category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        if (currentBalance < data.allocatedAmount) {
          throw new Error('Insufficient funds in feeding category');
        }

        // Then, do all writes
        // 1. Create feeding round
        const roundRef = doc(collection(db, FEEDING_ROUNDS));
        transaction.set(roundRef, {
          ...data,
          createdAt: Timestamp.now()
        });

        // 2. Update treasury balance
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

  update: async (id: string, data: Partial<FeedingRound>) => {
    try {
      const docRef = doc(db, FEEDING_ROUNDS, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating feeding round:', error);
      throw error;
    }
  },

  updateStatus: async (id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      const docRef = doc(db, FEEDING_ROUNDS, id);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating feeding round status:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        // First, get the feeding round to know the amount to refund
        const roundRef = doc(db, FEEDING_ROUNDS, id);
        const roundDoc = await transaction.get(roundRef);
        
        if (!roundDoc.exists()) {
          throw new Error('Feeding round not found');
        }

        const roundData = roundDoc.data();
        
        // Get the feeding category to refund the amount
        const categoryRef = doc(db, TREASURY, roundData.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Feeding category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;

        // Delete the feeding round
        transaction.delete(roundRef);

        // Refund the amount to the treasury
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

// Treasury Services
export const treasuryServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, TREASURY));
      const categories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Raw categories from Firebase:', categories);
      return categories;
    } catch (error) {
      console.error('Error fetching treasury categories:', error);
      throw error;
    }
  },

  create: async (data: { name: string; balance: number }) => {
    try {
      await addDoc(collection(db, TREASURY), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error creating treasury category:', error);
      throw error;
    }
  },

  adjustBalance: async (id: string, amount: number, isDeduction: boolean = false) => {
    try {
      const docRef = doc(db, TREASURY, id);
      await runTransaction(db, async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = doc.data().balance || 0;
        // If it's a deduction, automatically make the amount negative
        const adjustedAmount = isDeduction ? -Math.abs(amount) : amount;
        const newBalance = currentBalance + adjustedAmount;
        
        if (newBalance < 0) {
          throw new Error('Insufficient funds');
        }

        transaction.update(docRef, {
          balance: newBalance,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error adjusting treasury balance:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<TreasuryCategory>) => {
    try {
      const docRef = doc(db, TREASURY, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating treasury category:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      const docRef = doc(db, TREASURY, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting treasury category:', error);
      throw error;
    }
  }
};