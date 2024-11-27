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

export const donorServices = {
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