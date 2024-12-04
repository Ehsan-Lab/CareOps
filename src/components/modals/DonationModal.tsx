import React from 'react';
import { useForm } from 'react-hook-form';
import { X, DollarSign, Calendar, FileText } from 'lucide-react';
import { donationServices } from '../../services/firebase/donationService';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';
import { useFirebaseQuery } from '../../hooks/useFirebaseQuery';
import { Donation } from '../../types';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  donation?: Donation | null;
}

interface DonationFormData {
  donorId: string;
  amount: string;
  purpose: string;
  categoryId: string;
  date: string;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose, donation }) => {
  const queryClient = useQueryClient();
  const { donors } = useFirebaseQuery();
  const categories = useStore((state) => state.treasuryCategories);
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<DonationFormData>({
    defaultValues: donation ? {
      donorId: donation.donorId,
      amount: String(donation.amount),
      purpose: donation.purpose,
      categoryId: donation.categoryId,
      date: donation.date
    } : {
      donorId: '',
      amount: '',
      purpose: '',
      categoryId: '',
      date: new Date().toISOString().split('T')[0]
    }
  });

  React.useEffect(() => {
    if (donation) {
      reset({
        donorId: donation.donorId,
        amount: String(donation.amount),
        purpose: donation.purpose,
        categoryId: donation.categoryId,
        date: donation.date
      });
    } else {
      reset({
        donorId: '',
        amount: '',
        purpose: '',
        categoryId: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
  }, [donation, reset]);

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const onSubmit = async (data: DonationFormData) => {
    try {
      if (donation?.id) {
        await donationServices.update(donation.id, {
          ...data,
          amount: parseFloat(data.amount),
          donorId: data.donorId,
          categoryId: data.categoryId
        });
      } else {
        await donationServices.create({
          ...data,
          amount: parseFloat(data.amount),
          donorId: data.donorId,
          categoryId: data.categoryId
        });
      }
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
      onClose();
    } catch (error) {
      console.error('Error saving donation:', error);
      alert('Failed to save donation: ' + (error as Error).message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">{donation ? 'Edit Donation' : 'Add Donation'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Donor</label>
              <select
                {...register('donorId', { required: 'Donor is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Amount
                </div>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { 
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Purpose
                </div>
              </label>
              <input
                type="text"
                {...register('purpose', { required: 'Purpose is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} (Current Balance: ${category.balance?.toFixed(2) || '0.00'})
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
              )}
              {selectedCategory && (
                <p className="mt-1 text-sm text-gray-500">
                  Current Balance: ${selectedCategory.balance?.toFixed(2) || '0.00'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date
                </div>
              </label>
              <input
                type="date"
                {...register('date', { required: 'Date is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
              >
                {donation ? 'Save Changes' : 'Add Donation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};