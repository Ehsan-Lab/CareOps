import { 
  collection, 
  doc,
  getDocs, 
  Timestamp,
  query,
  limit,
  orderBy,
  startAfter,
  addDoc,
  DocumentSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from './firebase/constants';

const BATCH_SIZE = 10;

export interface Transaction {
  type: 'CREDIT' | 'DEBIT' | 'STATUS_UPDATE';
  amount: number;
  description: string;
  category: string;
  reference: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  lastDoc: DocumentSnapshot | null;
}

export const transactionServices = {
  /**
   * Records a new transaction in the transactions collection
   * @param {Transaction} data - Transaction data to record
   * @returns {Promise<void>}
   */
  recordTransaction: async (data: Transaction): Promise<void> => {
    try {
      const now = Timestamp.now();
      await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
        ...data,
        status: 'COMPLETED',
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
  },

  /**
   * Retrieves transactions with pagination and optional filtering
   * @param {number} pageSize - Number of transactions per page
   * @param {DocumentSnapshot} [startAfterDoc] - Document to start after for pagination
   * @param {string} [type] - Optional transaction type filter
   * @returns {Promise<PaginatedTransactions>} Paginated transactions and last document
   */
  getAll: async (
    pageSize: number = BATCH_SIZE,
    startAfterDoc?: DocumentSnapshot,
    type?: 'CREDIT' | 'DEBIT' | 'STATUS_UPDATE'
  ): Promise<PaginatedTransactions> => {
    try {
      let q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (type) {
        q = query(q, where('type', '==', type));
      }

      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      const querySnapshot = await getDocs(q);
      
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        transactions,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
  }
}; 