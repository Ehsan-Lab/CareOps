/**
 * @module FirebaseServices
 * @description Services for interacting with Firebase Firestore database
 * Provides CRUD operations for donors, donations, feeding rounds, treasury, beneficiaries, and payments
 */

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

/** Collection names in Firestore */
const DONORS = 'donors';
const DONATIONS = 'donations';
const FEEDING_ROUNDS = 'feedingRounds';
const TREASURY = 'treasury';
const BENEFICIARIES = 'beneficiaries';
const PAYMENTS = 'payments';

/**
 * @namespace donorServices
 * @description Services for managing donor data in Firestore
 */
export const donorServices = {
  /**
   * Retrieves all donors from the database
   * @returns {Promise<Donor[]>} Array of donor objects
   * @throws {Error} If the Firebase operation fails
   */
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
  
  /**
   * Creates a new donor in the database
   * @param {Omit<Donor, 'id'>} data - Donor data without ID
   * @returns {Promise<DocumentReference>} Reference to the created document
   * @throws {Error} If saving the donor fails
   */
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
  
  /**
   * Updates an existing donor's information
   * @param {string} id - Donor ID
   * @param {Partial<Donor>} data - Partial donor data to update
   * @throws {Error} If updating the donor fails
   */
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
  
  /**
   * Deletes a donor from the database
   * @param {string} id - Donor ID
   * @throws {Error} If deleting the donor fails
   */
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

/**
 * @interface CreateDonationData
 * @description Data required to create a new donation
 */
interface CreateDonationData {
  /** ID of the donor making the donation */
  donorId: string;
  /** Amount being donated */
  amount: number;
  /** Purpose of the donation */
  purpose: string;
  /** ID of the treasury category receiving the donation */
  categoryId: string;
  /** Date of the donation */
  date: string;
}

/**
 * @namespace donationServices
 * @description Services for managing donation data in Firestore
 */
export const donationServices = {
  /**
   * Retrieves all donations from the database
   * @returns {Promise<Donation[]>} Array of donation objects
   * @throws {Error} If fetching donations fails
   */
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

  /**
   * Creates a new donation and updates treasury balance in a transaction
   * @param {CreateDonationData} data - Donation data
   * @throws {Error} If creating the donation fails or treasury category not found
   */
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

/**
 * @namespace feedingRoundServices
 * @description Services for managing feeding round data in Firestore
 */
export const feedingRoundServices = {
  /**
   * Retrieves all feeding rounds from the database
   * @returns {Promise<FeedingRound[]>} Array of feeding round objects
   * @throws {Error} If fetching feeding rounds fails
   */
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

  /**
   * Creates a new feeding round and updates treasury balance in a transaction
   * @param {Omit<FeedingRound, 'id'>} data - Feeding round data without ID
   * @throws {Error} If creating the feeding round fails or insufficient funds
   */
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

  /**
   * Updates an existing feeding round's information
   * @param {string} id - Feeding round ID
   * @param {Partial<FeedingRound>} data - Partial feeding round data to update
   * @throws {Error} If updating the feeding round fails
   */
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

  /**
   * Updates the status of a feeding round
   * @param {string} id - Feeding round ID
   * @param {'PENDING' | 'IN_PROGRESS' | 'COMPLETED'} status - New status
   * @throws {Error} If updating the status fails
   */
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

  /**
   * Deletes a feeding round and refunds the allocated amount to treasury
   * @param {string} id - Feeding round ID
   * @throws {Error} If deleting the feeding round fails or refund fails
   */
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

/**
 * @namespace treasuryServices
 * @description Services for managing treasury categories and balances in Firestore
 */
export const treasuryServices = {
  /**
   * Retrieves all treasury categories from the database
   * @returns {Promise<TreasuryCategory[]>} Array of treasury category objects
   * @throws {Error} If fetching treasury categories fails
   */
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, TREASURY));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching treasury categories:', error);
      throw error;
    }
  },

  /**
   * Creates a new treasury category
   * @param {Omit<TreasuryCategory, 'id'>} data - Treasury category data without ID
   * @returns {Promise<DocumentReference>} Reference to the created document
   * @throws {Error} If creating the treasury category fails
   */
  create: async (data: Omit<TreasuryCategory, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, TREASURY), {
        ...data,
        balance: 0,
        createdAt: Timestamp.now()
      });
      return docRef;
    } catch (error) {
      console.error('Error creating treasury category:', error);
      throw error;
    }
  },

  /**
   * Updates an existing treasury category's information
   * @param {string} id - Treasury category ID
   * @param {Partial<TreasuryCategory>} data - Partial treasury category data to update
   * @throws {Error} If updating the treasury category fails
   */
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

  /**
   * Deletes a treasury category
   * @param {string} id - Treasury category ID
   * @throws {Error} If deleting the treasury category fails
   */
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

/**
 * @namespace beneficiaryServices
 * @description Services for managing beneficiary data in Firestore
 */
export const beneficiaryServices = {
  /**
   * Retrieves all beneficiaries from the database
   * @returns {Promise<Beneficiary[]>} Array of beneficiary objects
   * @throws {Error} If fetching beneficiaries fails
   */
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, BENEFICIARIES));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
      throw error;
    }
  },

  /**
   * Creates a new beneficiary
   * @param {Omit<Beneficiary, 'id'>} data - Beneficiary data without ID
   * @returns {Promise<DocumentReference>} Reference to the created document
   * @throws {Error} If creating the beneficiary fails
   */
  create: async (data: Omit<Beneficiary, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, BENEFICIARIES), {
        ...data,
        status: 'ACTIVE',
        createdAt: Timestamp.now()
      });
      return docRef;
    } catch (error) {
      console.error('Error creating beneficiary:', error);
      throw error;
    }
  },

  /**
   * Updates an existing beneficiary's information
   * @param {string} id - Beneficiary ID
   * @param {Partial<Beneficiary>} data - Partial beneficiary data to update
   * @throws {Error} If updating the beneficiary fails
   */
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

  /**
   * Updates a beneficiary's status
   * @param {string} id - Beneficiary ID
   * @param {'ACTIVE' | 'INACTIVE'} status - New status
   * @throws {Error} If updating the status fails
   */
  updateStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE') => {
    try {
      const docRef = doc(db, BENEFICIARIES, id);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating beneficiary status:', error);
      throw error;
    }
  },

  /**
   * Deletes a beneficiary
   * @param {string} id - Beneficiary ID
   * @throws {Error} If deleting the beneficiary fails
   */
  delete: async (id: string) => {
    try {
      const docRef = doc(db, BENEFICIARIES, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting beneficiary:', error);
      throw error;
    }
  }
};

/**
 * @namespace paymentServices
 * @description Services for managing payment data in Firestore
 */
export const paymentServices = {
  /**
   * Retrieves all payments from the database
   * @returns {Promise<Payment[]>} Array of payment objects
   * @throws {Error} If fetching payments fails
   */
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, PAYMENTS));
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
   * Creates a new payment and updates treasury balance in a transaction
   * @param {Omit<Payment, 'id' | 'status'>} data - Payment data without ID and status
   * @returns {Promise<void>}
   * @throws {Error} If creating the payment fails or insufficient funds
   */
  create: async (data: Omit<Payment, 'id' | 'status'>) => {
    try {
      await runTransaction(db, async (transaction) => {
        // First, do all reads
        const categoryRef = doc(db, TREASURY, data.categoryId);
        const categoryDoc = await transaction.get(categoryRef);
        
        if (!categoryDoc.exists()) {
          throw new Error('Treasury category not found');
        }

        const currentBalance = categoryDoc.data().balance || 0;
        if (currentBalance < data.amount) {
          throw new Error('Insufficient funds in treasury category');
        }

        // Then, do all writes
        // 1. Create payment
        const paymentRef = doc(collection(db, PAYMENTS));
        transaction.set(paymentRef, {
          ...data,
          status: 'PENDING',
          createdAt: Timestamp.now()
        });

        // 2. Update treasury balance
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

  /**
   * Updates an existing payment's information
   * @param {string} id - Payment ID
   * @param {Partial<Payment>} data - Partial payment data to update
   * @throws {Error} If updating the payment fails
   */
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

  /**
   * Updates the status of a payment
   * @param {string} id - Payment ID
   * @param {'PENDING' | 'COMPLETED' | 'CANCELLED'} status - New status
   * @throws {Error} If updating the status fails
   */
  updateStatus: async (id: string, status: 'PENDING' | 'COMPLETED' | 'CANCELLED') => {
    try {
      const docRef = doc(db, PAYMENTS, id);
      await updateDoc(docRef, {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  /**
   * Deletes a payment and refunds the amount to treasury if not completed
   * @param {string} id - Payment ID
   * @throws {Error} If deleting the payment fails or refund fails
   */
  delete: async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        // First, get the payment to know the amount to refund
        const paymentRef = doc(db, PAYMENTS, id);
        const paymentDoc = await transaction.get(paymentRef);
        
        if (!paymentDoc.exists()) {
          throw new Error('Payment not found');
        }

        const paymentData = paymentDoc.data();
        
        // Only refund if payment was not completed
        if (paymentData.status !== 'COMPLETED') {
          // Get the treasury category to refund the amount
          const categoryRef = doc(db, TREASURY, paymentData.categoryId);
          const categoryDoc = await transaction.get(categoryRef);
          
          if (!categoryDoc.exists()) {
            throw new Error('Treasury category not found');
          }

          const currentBalance = categoryDoc.data().balance || 0;

          // Update treasury balance
          transaction.update(categoryRef, {
            balance: currentBalance + paymentData.amount,
            updatedAt: Timestamp.now()
          });
        }

        // Delete the payment
        transaction.delete(paymentRef);
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }
};