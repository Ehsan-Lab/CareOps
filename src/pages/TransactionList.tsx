import React, { useState } from 'react';
import { useAllData } from '../hooks/useFirebaseQuery';
import { format } from 'date-fns';
import { DollarSign, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { transactionServices } from '../services/firebase/transactionService';
import { logger } from '../utils/logger';

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'STATUS_UPDATE';
  amount: number;
  description: string;
  category: string;
  reference: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const TransactionsList: React.FC = () => {
  const { data, isLoading, error } = useAllData();
  const [sortField, setSortField] = useState<'date' | 'amount' | 'type'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT' | 'STATUS_UPDATE'>('ALL');

  // Validate and transform transactions data
  const validTransactions = React.useMemo(() => {
    if (!data?.transactions?.transactions || !Array.isArray(data.transactions.transactions)) {
      logger.warn('No valid transactions found:', { data }, 'TransactionsList');
      return [];
    }
    
    return data.transactions.transactions.filter(transaction => 
      transaction && 
      typeof transaction === 'object' &&
      transaction.type &&
      transaction.amount &&
      transaction.createdAt
    );
  }, [data]);

  const sortedTransactions = React.useMemo(() => {
    if (!validTransactions.length) return [];
    
    return [...validTransactions]
      .filter(transaction => filterType === 'ALL' || transaction.type === filterType)
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'date':
            comparison = a.createdAt.toMillis() - b.createdAt.toMillis();
            break;
          case 'amount':
            comparison = a.amount - b.amount;
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [validTransactions, sortField, sortDirection, filterType]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading transactions. Please try again later.
      </div>
    );
  }

  // ... rest of the component JSX ...
};

export default TransactionsList; 