import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { feedingRoundServices } from '../../services/firebase/feedingRoundService';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';
import { FeedingRound } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';

interface FeedingRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  round?: FeedingRound | null;
}

interface FeedingRoundFormData {
  date: string;
  allocatedAmount: string;
  unitPrice: string;
  description: string;
  observations: string;
  specialCircumstances: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export const FeedingRoundModal: React.FC<FeedingRoundModalProps> = ({ 
  isOpen, 
  onClose,
  round 
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { treasuryCategories, setFeedingRounds, feedingRounds } = useStore();
  
  // Log available categories
  console.log('Available treasury categories:', treasuryCategories);
  
  // Look for a feeding category with more flexible matching
  const feedingCategory = treasuryCategories.find(c => {
    const name = c.name.toLowerCase();
    const isFeeding = name.includes('feed') || 
                     name.includes('meal') || 
                     name.includes('food');
    console.log(`Category "${c.name}": ${isFeeding ? 'matches' : 'does not match'} feeding criteria`);
    return isFeeding;
  });

  console.log('Selected feeding category:', feedingCategory);

  // Show warning if no feeding category is found
  React.useEffect(() => {
    if (!feedingCategory && treasuryCategories.length > 0) {
      const message = 'No feeding category found in treasury. Please create a category with "feeding", "meal", or "food" in its name. Available categories: ' + 
        treasuryCategories.map(c => c.name).join(', ');
      console.warn(message);
      setSubmitError(message);
    } else {
      setSubmitError(null);
    }
  }, [feedingCategory, treasuryCategories]);
  
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FeedingRoundFormData>({
    defaultValues: round ? {
      date: round.date,
      allocatedAmount: round.allocatedAmount.toString(),
      unitPrice: round.unitPrice?.toString() || '',
      description: round.description || '',
      observations: round.observations || '',
      specialCircumstances: round.specialCircumstances || '',
      status: round.status
    } : {
      date: new Date().toISOString().split('T')[0],
      allocatedAmount: '',
      unitPrice: '',
      description: '',
      observations: '',
      specialCircumstances: '',
      status: 'PENDING'
    }
  });

  React.useEffect(() => {
    if (round) {
      reset({
        date: round.date,
        allocatedAmount: round.allocatedAmount.toString(),
        unitPrice: round.unitPrice?.toString() || '',
        description: round.description || '',
        observations: round.observations || '',
        specialCircumstances: round.specialCircumstances || '',
        status: round.status
      });
    } else {
      reset({
        date: new Date().toISOString().split('T')[0],
        allocatedAmount: '',
        unitPrice: '',
        description: '',
        observations: '',
        specialCircumstances: '',
        status: 'PENDING'
      });
    }
  }, [round, reset]);

  const allocatedAmount = parseFloat(watch('allocatedAmount') || '0');
  const unitPrice = parseFloat(watch('unitPrice') || '0');
  const totalUnits = unitPrice > 0 ? allocatedAmount / unitPrice : 0;

  const onSubmit = async (data: FeedingRoundFormData) => {
    if (!feedingCategory) {
      setSubmitError('Feeding category not found');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formattedData = {
        ...data,
        allocatedAmount: parseFloat(data.allocatedAmount),
        unitPrice: parseFloat(data.unitPrice),
        description: data.description.trim(),
        observations: data.observations.trim(),
        specialCircumstances: data.specialCircumstances.trim()
      };

      if (round?.id) {
        const updatedRound = await feedingRoundServices.update(round.id, formattedData);
        setFeedingRounds({
          rounds: feedingRounds.rounds.map(r => 
            r.id === round.id ? updatedRound : r
          ),
          lastDoc: feedingRounds.lastDoc
        });
      } else {
        const newRound = await feedingRoundServices.create({
          ...formattedData,
          status: 'PENDING',
          categoryId: feedingCategory.id
        });
        setFeedingRounds({
          rounds: [newRound, ...feedingRounds.rounds],
          lastDoc: feedingRounds.lastDoc
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['all-data'] });
      await queryClient.refetchQueries({ queryKey: ['all-data'] });
      
      reset();
      onClose();
      navigate('/feeding-rounds');
    } catch (error) {
      console.error('Error saving feeding round:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to save feeding round');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">
              {round ? 'Edit' : 'New'} Feeding Round
            </h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-500"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {submitError && (
            <Alert severity="error" className="mb-4">
              {submitError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('unitPrice', { 
                    required: 'Unit price is required',
                    min: { value: 0.01, message: 'Unit price must be greater than 0' }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
                {errors.unitPrice && (
                  <p className="mt-1 text-sm text-red-600">{errors.unitPrice.message}</p>
                )}
                {unitPrice > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Total Units: {totalUnits.toFixed(2)}
                  </p>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...register('description', {
                  maxLength: { value: 500, message: 'Description cannot exceed 500 characters' }
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="General description of the feeding round..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Observations</label>
              <textarea
                {...register('observations')}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="Any observations during the feeding round..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Special Circumstances</label>
              <textarea
                {...register('specialCircumstances')}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="Any special circumstances or conditions..."
              />
            </div>

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
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : round ? 'Update' : 'Create'} Round
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};