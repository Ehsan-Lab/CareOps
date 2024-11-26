import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { feedingRoundServices } from '../../services/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';
import { FeedingRound } from '../../types';

interface FeedingRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  round?: FeedingRound | null;
}

interface FeedingRoundFormData {
  date: string;
  allocatedAmount: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export const FeedingRoundModal: React.FC<FeedingRoundModalProps> = ({ 
  isOpen, 
  onClose,
  round 
}) => {
  const queryClient = useQueryClient();
  const categories = useStore((state) => state.treasuryCategories);
  const feedingCategory = categories.find(c => c.name.toLowerCase() === 'feeding');
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FeedingRoundFormData>({
    defaultValues: round ? {
      date: round.date,
      allocatedAmount: round.allocatedAmount.toString(),
      status: round.status
    } : {
      date: new Date().toISOString().split('T')[0],
      allocatedAmount: '',
      status: 'PENDING'
    }
  });

  React.useEffect(() => {
    if (round) {
      reset({
        date: round.date,
        allocatedAmount: round.allocatedAmount.toString(),
        status: round.status
      });
    } else {
      reset({
        date: new Date().toISOString().split('T')[0],
        allocatedAmount: '',
        status: 'PENDING'
      });
    }
  }, [round, reset]);

  const onSubmit = async (data: FeedingRoundFormData) => {
    if (!feedingCategory) {
      alert('Feeding category not found');
      return;
    }

    try {
      if (round?.id) {
        await feedingRoundServices.update(round.id, {
          ...data,
          allocatedAmount: parseFloat(data.allocatedAmount)
        });
      } else {
        await feedingRoundServices.create({
          ...data,
          allocatedAmount: parseFloat(data.allocatedAmount),
          status: 'PENDING',
          categoryId: feedingCategory.id
        });
      }
      queryClient.invalidateQueries({ queryKey: ['feedingRounds'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      onClose();
    } catch (error) {
      console.error('Error saving feeding round:', error);
      alert(error instanceof Error ? error.message : 'Failed to save feeding round');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">
              {round ? 'Edit' : 'New'} Feeding Round
            </h3>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                {...register('allocatedAmount', { 
                  required: 'Amount is required',
                  min: { value: 0, message: 'Amount must be positive' }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
              {errors.allocatedAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.allocatedAmount.message}</p>
              )}
            </div>

            {round && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  {...register('status')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            )}

            {feedingCategory && (
              <p className="text-sm text-gray-500">
                Available balance: ${feedingCategory.balance.toFixed(2)}
              </p>
            )}

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
                {round ? 'Update' : 'Create'} Round
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};