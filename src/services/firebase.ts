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
  runTransaction,
  arrayUnion,
  arrayRemove,
  deleteField
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Donor, Donation, FeedingRound, TreasuryCategory, Beneficiary, Payment } from '../types';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Collection references
const DONORS = 'donors';
const DONATIONS = 'donations';
const FEEDING_ROUNDS = 'feedingRounds';
const TREASURY = 'treasury';
const BENEFICIARIES = 'beneficiaries';
const PAYMENTS = 'payments';

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
  },

  uploadPhotos: async (roundId: string, files: File[]) => {
    try {
      const storage = getStorage();
      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `feeding-rounds/${roundId}/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
      });

      const urls = await Promise.all(uploadPromises);

      // Update feeding round with new photo URLs
      const docRef = doc(db, FEEDING_ROUNDS, roundId);
      await updateDoc(docRef, {
        photos: arrayUnion(...urls),
        updatedAt: Timestamp.now()
      });

      return urls;
    } catch (error) {
      console.error('Error uploading photos:', error);
      throw error;
    }
  },

  deletePhoto: async (roundId: string, photoUrl: string) => {
    try {
      const storage = getStorage();
      // Delete from storage
      const storageRef = ref(storage, photoUrl);
      await deleteObject(storageRef);

      // Remove URL from feeding round document
      const docRef = doc(db, FEEDING_ROUNDS, roundId);
      await updateDoc(docRef, {
        photos: arrayRemove(photoUrl),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  },

  addDriveLink: async (roundId: string, driveLink: string) => {
    try {
      const docRef = doc(db, FEEDING_ROUNDS, roundId);
      await updateDoc(docRef, {
        driveLink,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding drive link:', error);
      throw error;
    }
  },

  removeDriveLink: async (roundId: string) => {
    try {
      const docRef = doc(db, FEEDING_ROUNDS, roundId);
      await updateDoc(docRef, {
        driveLink: deleteField(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error removing drive link:', error);
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

// Beneficiary Services
export const beneficiaryServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, BENEFICIARIES));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Beneficiary[];
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
      throw error;
    }
  },

  create: async (data: Omit<Beneficiary, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addDoc(collection(db, BENEFICIARIES), {
        ...data,
        status: 'ACTIVE',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error creating beneficiary:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Beneficiary>) => {
    try {
      const docRef = doc(db, BENEFICIARIES, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating beneficiary:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      const docRef = doc(db, BENEFICIARIES, id);
      await updateDoc(docRef, {
        status: 'INACTIVE',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error deactivating beneficiary:', error);
      throw error;
    }
  }
};

// Payment Services
export const paymentServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, PAYMENTS));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  create: async (data: Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      await runTransaction(db, async (transaction) => {
        // Check treasury balance
        const categoryRef = doc(db, TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        if (currentBalance < data.amount) {
          throw new Error('Insufficient funds in category');
        }

        // Create payment
        const paymentRef = doc(collection(db, PAYMENTS));
        transaction.set(paymentRef, {
          ...data,
          status: 'COMPLETED',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });

        // Update treasury balance
        transaction.update(categoryRef, {
          balance: currentBalance - data.amount,
          updatedAt: Timestamp.now()
        });
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Payment>) => {
    try {
      const docRef = doc(db, PAYMENTS, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  cancel: async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, PAYMENTS, id);
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists()) {
          throw new Error('Payment not found');
        }

        const paymentData = paymentDoc.data();
        if (paymentData.status === 'CANCELLED') {
          throw new Error('Payment already cancelled');
        }

        // Refund the amount to treasury
        const categoryRef = doc(db, TREASURY, paymentData.categoryId);
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
  }
};