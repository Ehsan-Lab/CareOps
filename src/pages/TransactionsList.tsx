import React, { useState } from 'react';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { format } from 'date-fns';
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { DocumentSnapshot } from 'firebase/firestore';

interface PaginatedTransactions {
  transactions: Transaction[];
  lastDoc: DocumentSnapshot | null;
}

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  category: string;
  date: string;
  reference: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

const TransactionsList: React.FC = () => {
  const { transactions = { transactions: [], lastDoc: null }, isLoading, error } = useFirebaseQuery();
  const [sortField, setSortField] = useState<'date' | 'amount' | 'type'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  // Validate and transform transactions data
  const validTransactions = React.useMemo(() => {
    return transactions?.transactions?.filter(transaction => 
      transaction && 
      typeof transaction === 'object' &&
      transaction.type &&
      transaction.amount &&
      transaction.date
    ) ?? [];
  }, [transactions?.transactions]);

  const sortedTransactions = React.useMemo(() => {
    if (!validTransactions.length) return [];
    
    return [...validTransactions]
      .filter(transaction => filterType === 'ALL' || transaction.type === filterType)
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
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

  React.useEffect(() => {
    if (transactions.lastDoc) {
      setLastDoc(transactions.lastDoc);
      setHasMore(true);
    } else {
      setHasMore(false);
    }
  }, [transactions.lastDoc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
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
            onChange={(e) => setFilterType(e.target.value as 'ALL' | 'CREDIT' | 'DEBIT')}
            className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
            aria-label="Filter transactions by type"
          >
            <option value="ALL">All Transactions</option>
            <option value="CREDIT">Credits Only</option>
            <option value="DEBIT">Debits Only</option>
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
                        {format(new Date(transaction.date), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          transaction.type === 'CREDIT' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
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

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {/* TODO: Implement loadMore */}}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionsList; 