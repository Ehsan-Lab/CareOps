import React from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { TreasuryCategoryModal } from '../components/modals/TreasuryCategoryModal';
import { treasuryServices } from '../services/firebase/treasuryService';
import { useQueryClient } from '@tanstack/react-query';
import { useAllData } from '../hooks/useFirebaseQuery';
import { TreasuryCategory } from '../types';
import { TreasuryValidation, useTreasuryValidation } from '../components/TreasuryValidation';

const TreasuryList: React.FC = () => {
  const { data, isLoading } = useAllData();
  const categories = (data?.treasury || []) as TreasuryCategory[];
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { runValidation, isValidating, validationResults } = useTreasuryValidation();

  const handleAdjustBalance = async (id: string) => {
    const adjustmentAmount = parseFloat(
      window.prompt('Enter amount to adjust (use negative for withdrawal):', '0') || '0'
    );

    if (adjustmentAmount) {
      try {
        await treasuryServices.adjustBalance(id, adjustmentAmount);
        queryClient.invalidateQueries({ queryKey: ['all-data'] });
      } catch (error) {
        console.error('Error adjusting balance:', error);
        alert('Failed to adjust balance. Please try again.');
      }
    }
  };

  const handleDeduct = async (id: string) => {
    const amount = prompt('Enter amount to deduct:');
    if (!amount) return;

    try {
      await treasuryServices.adjustBalance(id, parseFloat(amount), true);
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to deduct amount');
    }
  };

  const totalBalance = categories.reduce((sum: number, cat: TreasuryCategory) => sum + cat.balance, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-purple-600" />
            Treasury Management
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and manage fund categories and balances
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex gap-2">
          <button
            type="button"
            onClick={runValidation}
            disabled={isValidating}
            className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {isValidating ? 'Validating...' : 'Test Validation'}
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>
      </div>

      <TreasuryValidation 
        isVisible={!!validationResults} 
        validationResults={validationResults} 
      />

      {/* Summary Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wallet className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Balance
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ${totalBalance.toFixed(2)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Category
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Balance
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {categories.map((category: TreasuryCategory) => (
                    <tr key={category.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {category.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${category.balance.toFixed(2)}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            className="text-green-600 hover:text-green-900"
                            onClick={() => handleAdjustBalance(category.id)}
                            title="Add funds"
                            aria-label={`Add funds to ${category.name}`}
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeduct(category.id)}
                            title="Deduct funds"
                            aria-label={`Deduct funds from ${category.name}`}
                          >
                            <TrendingDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <TreasuryCategoryModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default TreasuryList;