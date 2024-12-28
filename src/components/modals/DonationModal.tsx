import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { donationServices } from '../../services/firebase/donationService';
import { useQueryClient } from '@tanstack/react-query';
import { useAllData } from '../../hooks/useFirebaseQuery';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DonationFormData {
  donorId: string;
  amount: string;
  purpose: string;
  categoryId: string;
  date: string;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAllData();
  const donors = data?.donors || [];
  const categories = data?.treasury || [];
  
  const { register, handleSubmit, formState: { errors } } = useForm<DonationFormData>({
    defaultValues: {
      donorId: '',
      amount: '',
      purpose: '',
      categoryId: '',
      date: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data: DonationFormData) => {
    try {
      await donationServices.create({
        ...data,
        amount: parseFloat(data.amount),
        donorId: String(data.donorId),
        categoryId: String(data.categoryId)
      });
      
      // Invalidate and refetch all relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['all-data'] }),
        queryClient.refetchQueries({ queryKey: ['all-data'] })
      ]);
      
      onClose();
    } catch (error) {
      console.error('Error saving donation:', error);
      alert('Failed to save donation. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Add Donation</h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-500"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Donor</label>
              <select
                {...register('donorId', { required: 'Donor is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
              >
                <option value="">Select a donor</option>
                {donors?.map((donor) => (
                  <option key={donor.id} value={donor.id}>{donor.name}</option>
                ))}
              </select>
              {errors.donorId && (
                <p className="mt-1 text-sm text-red-600">{errors.donorId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { required: 'Amount is required', min: 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Purpose</label>
              <input
                type="text"
                {...register('purpose', { required: 'Purpose is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                {...register('categoryId', { required: 'Category is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
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

            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                {...register('date', { required: 'Date is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Add Donation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};