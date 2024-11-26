import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { feedingRoundServices } from '../../services/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';

interface FeedingRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedingRoundModal: React.FC<FeedingRoundModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const categories = useStore((state) => state.treasuryCategories);
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      allocatedAmount: '',
      defaultAmount: '',
      categoryId: '',
      status: 'PENDING'
    }
  });

  const onSubmit = async (data: any) => {
    try {
      await feedingRoundServices.create({
        ...data,
        allocatedAmount: parseFloat(data.allocatedAmount),
        defaultAmount: parseFloat(data.defaultAmount),
        categoryId: parseInt(data.categoryId)
      });
      queryClient.invalidateQueries({ queryKey: ['feedingRounds'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      onClose();
    } catch (error) {
      console.error('Error creating feeding round:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">New Feeding Round</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                {...register('date', { required: 'Date is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Allocated Amount</label>
              <input
                type="number"
                step="0.01"
                {...register('allocatedAmount', { required: 'Amount is required', min: 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.allocatedAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.allocatedAmount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Default Amount</label>
              <input
                type="number"
                step="0.01"
                {...register('defaultAmount', { required: 'Default amount is required', min: 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.defaultAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.defaultAmount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                {...register('categoryId', { required: 'Category is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Create Round
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};