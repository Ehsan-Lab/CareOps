/**
 * @module DonorService
 * @description Service for managing donor data in Firestore
 */

import { 
  collection, 
  doc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Donor } from '../../types';
import { COLLECTIONS } from './constants';

/**
 * @namespace donorServices
 * @description Service object containing donor-related operations
 */
export const donorServices = {
  /**
   * Retrieves all donors from the database
   * @async
   * @returns {Promise<Donor[]>} Array of donor objects
   * @throws {Error} If the Firebase operation fails
   */
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.DONORS));
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
   * @async
   * @param {Omit<Donor, 'id'>} data - Donor data without ID
   * @returns {Promise<DocumentReference>} Reference to the created document
   * @throws {Error} If saving the donor fails
   */
  create: async (data: Omit<Donor, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.DONORS), {
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
   * @async
   * @param {string} id - Donor ID
   * @param {Partial<Donor>} data - Partial donor data to update
   * @throws {Error} If updating the donor fails
   */
  update: async (id: string, data: Partial<Donor>) => {
    try {
      const docRef = doc(db, COLLECTIONS.DONORS, id);
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
   * @async
   * @param {string} id - Donor ID
   * @throws {Error} If deleting the donor fails
   */
  delete: async (id: string) => {
    try {
      const docRef = doc(db, COLLECTIONS.DONORS, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting donor:', error);
      throw error;
    }
  }
}; 