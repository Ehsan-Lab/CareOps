import React from 'react';
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { TreasuryCategoryModal } from '../components/modals/TreasuryCategoryModal';
import { treasuryServices } from '../services/firebase';

interface TreasuryCategory {
  id: string;
  name: string;
  balance: number;
  createdAt: any;
  updatedAt: any;
}

const TreasuryCategories: React.FC = () => {
  const { treasuryCategories } = useFirebaseQuery();
  const categories = treasuryCategories || [];
  console.log('Categories in component:', categories);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<TreasuryCategory | null>(null);
  const queryClient = useQueryClient();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await treasuryServices.delete(id);
        queryClient.invalidateQueries({ queryKey: ['treasury'] });
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  };

  const handleEdit = (category: TreasuryCategory) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-600" />
            Treasury Categories
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your treasury categories for donations and expenses
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
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
                      Name
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
                        ${category.balance?.toFixed(2) || '0.00'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            className="text-emerald-600 hover:text-emerald-900"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <TreasuryCategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
      />
    </div>
  );
};

export default TreasuryCategories; 