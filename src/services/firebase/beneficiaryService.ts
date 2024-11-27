import { 
  collection, 
  doc,
  getDocs, 
  addDoc,
  updateDoc, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Beneficiary } from '../../types';
import { COLLECTIONS } from './constants';

export const beneficiaryServices = {
  getAll: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.BENEFICIARIES));
      const beneficiaries = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Raw beneficiary data:', { id: doc.id, ...data });
        
        if (!data.name || !data.supportType) {
          console.warn('Beneficiary missing required fields:', { id: doc.id, ...data });
        }

        return {
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          supportType: data.supportType || 'FOOD',
          status: data.status || 'ACTIVE',
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null
        };
      });

      console.log('Processed beneficiaries:', beneficiaries);
      return beneficiaries;
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
      throw error;
    }
  },

  create: async (data: Omit<Beneficiary, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addDoc(collection(db, COLLECTIONS.BENEFICIARIES), {
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
      const docRef = doc(db, COLLECTIONS.BENEFICIARIES, id);
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
      const docRef = doc(db, COLLECTIONS.BENEFICIARIES, id);
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