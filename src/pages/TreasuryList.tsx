import React from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../store';
import { TreasuryCategoryModal } from '../components/modals/TreasuryCategoryModal';
import { treasuryServices } from '../services/firebase';
import { useQueryClient } from '@tanstack/react-query';

const TreasuryList: React.FC = () => {
  const categories = useStore((state) => state.treasuryCategories);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const handleAdjustBalance = async (id: string, amount: number) => {
    const adjustmentAmount = parseFloat(
      window.prompt('Enter amount to adjust (use negative for withdrawal):', '0') || '0'
    );

    if (adjustmentAmount) {
      try {
        await treasuryServices.adjustBalance(id, adjustmentAmount);
        queryClient.invalidateQueries({ queryKey: ['treasury'] });
      } catch (error) {
        console.error('Error adjusting balance:', error);
        alert('Failed to adjust balance. Please try again.');
      }
    }
  };

  const totalBalance = categories.reduce((sum, cat) => sum + cat.balance, 0);

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
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
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
                  {categories.map((category) => (
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
                            onClick={() => handleAdjustBalance(category.id, 1)}
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleAdjustBalance(category.id, -1)}
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