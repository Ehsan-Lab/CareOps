import React, { useState } from 'react';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { format } from 'date-fns';
import { DollarSign, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { transactionServices } from '../services/firebase/transactionService';

interface PaginatedTransactions {
  transactions: Transaction[];
  lastDoc: DocumentSnapshot | null;
}

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
  const { transactions, isLoading, error } = useFirebaseQuery();
  const [sortField, setSortField] = useState<'date' | 'amount' | 'type'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT' | 'STATUS_UPDATE'>('ALL');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  // Validate and transform transactions data
  const validTransactions = React.useMemo(() => {
    if (!transactions?.transactions || !Array.isArray(transactions.transactions)) {
      console.log('No valid transactions found:', transactions);
      return [];
    }
    
    return transactions.transactions.filter(transaction => 
      transaction && 
      typeof transaction === 'object' &&
      transaction.type &&
      transaction.amount &&
      transaction.createdAt
    );
  }, [transactions]);

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

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !lastDoc) return;
    
    try {
      setIsLoadingMore(true);
      const result = await transactionServices.getAll(10, lastDoc);
      setLastDoc(result.lastDoc);
      // Add new transactions to the list
      // TODO: Update this when implementing proper state management
    } catch (error) {
      console.error('Error loading more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
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

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            Transactions
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            View all financial transactions in the system
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            aria-label="Filter transactions by type"
          >
            <option value="ALL">All Transactions</option>
            <option value="CREDIT">Credits Only</option>
            <option value="DEBIT">Debits Only</option>
            <option value="STATUS_UPDATE">Status Updates</option>
          </select>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        <SortIcon field="date" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1">
                        Type
                        <SortIcon field="type" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center gap-1">
                        Amount
                        <SortIcon field="amount" />
                      </div>
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Reference
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {format(transaction.createdAt.toDate(), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          transaction.type === 'CREDIT' 
                            ? 'bg-green-100 text-green-800'
                            : transaction.type === 'DEBIT'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={
                          transaction.type === 'CREDIT' 
                            ? 'text-green-600' 
                            : transaction.type === 'DEBIT'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }>
                          ${transaction.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {transaction.category}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {transaction.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {transaction.reference}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          transaction.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {lastDoc && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionsList; 