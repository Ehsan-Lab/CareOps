import { 
  collection, 
  doc,
  getDocs, 
  addDoc,
  updateDoc, 
  Timestamp,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, getConnectionStatus } from '../../config/firebase';
import { Beneficiary } from '../../types';
import { COLLECTIONS } from './constants';

export const beneficiaryServices = {
  getAll: async () => {
    try {
      if (!getConnectionStatus()) {
        console.warn('Firebase connection not established, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Create a simpler query first to avoid index issues
      const beneficiariesQuery = query(
        collection(db, COLLECTIONS.BENEFICIARIES),
        where('status', '==', 'ACTIVE'),
        limit(100)
      );

      const querySnapshot = await getDocs(beneficiariesQuery);
      const beneficiaries = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Ensure all fields have default values
        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          supportType: data.supportType || 'FOOD',
          status: data.status || 'ACTIVE',
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now()
        };
      });

      // Sort beneficiaries in memory to avoid index requirements
      return beneficiaries.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
      if (error instanceof Error) {
        console.error('Detailed error:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  },

  create: async (data: Omit<Beneficiary, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!getConnectionStatus()) {
        throw new Error('Firebase is not connected');
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.BENEFICIARIES), {
        ...data,
        status: 'ACTIVE',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log('Beneficiary created successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating beneficiary:', error);
      throw error;
    }
  },

  update: async (id: string, data: Partial<Beneficiary>) => {
    try {
      if (!getConnectionStatus()) {
        throw new Error('Firebase is not connected');
      }

      const docRef = doc(db, COLLECTIONS.BENEFICIARIES, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });

      console.log('Beneficiary updated successfully:', id);
    } catch (error) {
      console.error('Error updating beneficiary:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      if (!getConnectionStatus()) {
        throw new Error('Firebase is not connected');
      }

      const docRef = doc(db, COLLECTIONS.BENEFICIARIES, id);
      await updateDoc(docRef, {
        status: 'INACTIVE',
        updatedAt: Timestamp.now()
      });

      console.log('Beneficiary deactivated successfully:', id);
    } catch (error) {
      console.error('Error deactivating beneficiary:', error);
      throw error;
    }
  }
};