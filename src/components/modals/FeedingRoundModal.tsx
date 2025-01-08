import React from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import { feedingRoundServices } from '../../services/firebase/feedingRoundService';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';
import { FeedingRound } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';
import { logger } from '../../utils/logger';
import { useAllData } from '../../hooks/useFirebaseQuery';

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
  categoryId: string;
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
  const { treasuryCategories, setFeedingRounds, feedingRounds, setTreasuryCategories } = useStore();
  const { data: allData, isLoading: isLoadingData } = useAllData();
  
  // Sync treasury categories from useAllData to store
  React.useEffect(() => {
    if (allData?.treasury && allData.treasury.length > 0) {
      logger.debug('Syncing treasury categories to store', { 
        count: allData.treasury.length,
        categories: allData.treasury
      }, 'FeedingRoundModal');
      setTreasuryCategories(allData.treasury);
    }
  }, [allData?.treasury, setTreasuryCategories]);

  logger.debug('Initializing FeedingRoundModal', { 
    isEditing: !!round,
    roundId: round?.id,
    availableCategories: treasuryCategories.length,
    storeCategories: treasuryCategories,
    allDataCategories: allData?.treasury
  }, 'FeedingRoundModal');
  
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FeedingRoundFormData>({
    defaultValues: round ? {
      date: round.date,
      allocatedAmount: round.allocatedAmount.toString(),
      unitPrice: round.unitPrice?.toString() || '',
      description: round.description || '',
      observations: round.observations || '',
      specialCircumstances: round.specialCircumstances || '',
      categoryId: round.categoryId || '',
      status: round.status
    } : {
      date: new Date().toISOString().split('T')[0],
      allocatedAmount: '',
      unitPrice: '',
      description: '',
      observations: '',
      specialCircumstances: '',
      categoryId: '',
      status: 'PENDING'
    }
  });

  // Log available categories when component mounts or categories change
  React.useEffect(() => {
    logger.debug('Available treasury categories', { 
      count: treasuryCategories.length,
      categories: treasuryCategories.map(c => ({
        id: c.id,
        name: c.name,
        balance: c.balance
      }))
    }, 'FeedingRoundModal');
  }, [treasuryCategories]);

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = React.useMemo(() => 
    treasuryCategories.find(c => c.id === selectedCategoryId),
    [selectedCategoryId, treasuryCategories]
  );
  
  const allocatedAmount = parseFloat(watch('allocatedAmount') || '0');
  const unitPrice = parseFloat(watch('unitPrice') || '0');
  const totalUnits = unitPrice > 0 ? allocatedAmount / unitPrice : 0;

  // Log category selection changes
  React.useEffect(() => {
    if (selectedCategoryId) {
      logger.debug('Treasury category selected', {
        categoryId: selectedCategoryId,
        categoryName: selectedCategory?.name,
        availableBalance: selectedCategory?.balance
      }, 'FeedingRoundModal');
    }
  }, [selectedCategoryId, selectedCategory]);

  const onSubmit = async (data: FeedingRoundFormData) => {
    logger.debug('Submitting feeding round form', { 
      formData: data,
      isEditing: !!round
    }, 'FeedingRoundModal');

    if (!selectedCategory) {
      const error = 'Please select a treasury category';
      logger.warn('Form submission failed - No category selected', {}, 'FeedingRoundModal');
      setSubmitError(error);
      return;
    }

    if (allocatedAmount > selectedCategory.balance) {
      const error = `Insufficient funds in selected category. Available balance: $${selectedCategory.balance.toFixed(2)}`;
      logger.warn('Form submission failed - Insufficient funds', {
        requested: allocatedAmount,
        available: selectedCategory.balance,
        categoryId: selectedCategory.id
      }, 'FeedingRoundModal');
      setSubmitError(error);
      return;
    }

    if (allocatedAmount <= 0) {
      const error = 'Allocated amount must be greater than 0';
      logger.warn('Form submission failed - Invalid amount', {
        amount: allocatedAmount
      }, 'FeedingRoundModal');
      setSubmitError(error);
      return;
    }

    if (unitPrice <= 0) {
      const error = 'Unit price must be greater than 0';
      logger.warn('Form submission failed - Invalid unit price', {
        unitPrice
      }, 'FeedingRoundModal');
      setSubmitError(error);
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
        specialCircumstances: data.specialCircumstances.trim(),
        categoryId: data.categoryId,
        status: data.status || 'PENDING'
      };

      logger.debug('Processing feeding round data', { 
        formattedData,
        isEditing: !!round
      }, 'FeedingRoundModal');

      if (round?.id) {
        try {
          const updatedRound = await feedingRoundServices.update(round.id, formattedData);
          logger.info('Successfully updated feeding round', {
            roundId: round.id,
            newStatus: updatedRound.status
          }, 'FeedingRoundModal');
          
          setFeedingRounds({
            rounds: feedingRounds.rounds.map(r => 
              r.id === round.id ? updatedRound : r
            ),
            lastDoc: feedingRounds.lastDoc
          });
        } catch (error) {
          logger.error('Failed to update feeding round', {
            roundId: round.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'FeedingRoundModal');
          throw error;
        }
      } else {
        try {
          const newRound = await feedingRoundServices.create(formattedData);
          logger.info('Successfully created new feeding round', {
            roundId: newRound.id,
            status: newRound.status
          }, 'FeedingRoundModal');

          setFeedingRounds({
            rounds: [newRound, ...feedingRounds.rounds],
            lastDoc: feedingRounds.lastDoc
          });
        } catch (error) {
          logger.error('Failed to create feeding round', {
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'FeedingRoundModal');
          throw error;
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['all-data'] });
      await queryClient.refetchQueries({ queryKey: ['all-data'] });
      
      logger.debug('Cleaning up after successful submission', {
        isEditing: !!round
      }, 'FeedingRoundModal');
      
      reset();
      onClose();
      navigate('/feeding-rounds');
    } catch (error) {
      logger.error('Error saving feeding round', {
        error: error instanceof Error ? error.message : 'Unknown error',
        isEditing: !!round
      }, 'FeedingRoundModal');
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

          {isLoadingData ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-2 text-sm text-gray-500">Loading categories...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Treasury Category</label>
                  <select
                    {...register('categoryId', { required: 'Treasury category is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    disabled={isSubmitting}
                  >
                    <option value="">Select a category</option>
                    {treasuryCategories.length === 0 ? (
                      <option value="" disabled>No categories available</option>
                    ) : (
                      treasuryCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name} (Balance: ${category.balance.toFixed(2)})
                        </option>
                      ))
                    )}
                  </select>
                  {errors.categoryId && (
                    <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                  )}
                  {selectedCategory && (
                    <p className="mt-1 text-sm text-gray-500">
                      Available balance: ${selectedCategory.balance.toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    {...register('date', { required: 'Date is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    disabled={isSubmitting}
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
                      min: { value: 0.01, message: 'Amount must be greater than 0' },
                      validate: value => {
                        if (!selectedCategory) return true;
                        const amount = parseFloat(value);
                        return amount <= selectedCategory.balance || 'Insufficient funds in selected category';
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Special Circumstances</label>
                <textarea
                  {...register('specialCircumstances')}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  placeholder="Any special circumstances or conditions..."
                  disabled={isSubmitting}
                />
              </div>

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
                  className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isSubmitting || isLoadingData}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Saving...' : round ? 'Update' : 'Create'} Round
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};