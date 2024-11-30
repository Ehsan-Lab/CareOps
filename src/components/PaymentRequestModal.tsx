import React from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar, DollarSign, FileText, Clock } from 'lucide-react';
import { paymentRequestServices } from '../services/firebase/paymentRequestService';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store';
import { PaymentRequest, PaymentRequestFormData, PaymentRequestStatus } from '../types/paymentRequest';
import { BeneficiaryCombobox } from './BeneficiaryCombobox';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request?: PaymentRequest | null;
  beneficiaryId?: string;
}

export function PaymentRequestModal({
  isOpen,
  onClose,
  request,
  beneficiaryId
}: PaymentRequestModalProps) {
  const queryClient = useQueryClient();
  const { treasuryCategories, beneficiaries, setPaymentRequests, paymentRequests } = useStore();
  const activeBeneficiaries = beneficiaries.filter(b => b.status === 'ACTIVE');
  const availableCategories = treasuryCategories.filter(c => c.balance > 0);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PaymentRequestFormData>({
    defaultValues: request ? {
      beneficiaryId: request.beneficiaryId,
      treasuryId: request.treasuryId,
      amount: request.amount,
      paymentType: request.paymentType,
      startDate: request.startDate,
      endDate: request.endDate,
      notes: request.notes,
      frequency: request.frequency,
      description: request.description
    } : {
      beneficiaryId: beneficiaryId || '',
      treasuryId: '',
      amount: 0,
      paymentType: 'ONE_TIME',
      startDate: new Date().toISOString().split('T')[0],
      notes: '',
      description: ''
    }
  });

  React.useEffect(() => {
    if (request) {
      reset({
        beneficiaryId: request.beneficiaryId,
        treasuryId: request.treasuryId,
        amount: request.amount,
        paymentType: request.paymentType,
        startDate: request.startDate,
        endDate: request.endDate,
        notes: request.notes,
        frequency: request.frequency,
        description: request.description
      });
    } else {
      reset({
        beneficiaryId: beneficiaryId || '',
        treasuryId: '',
        amount: 0,
        paymentType: 'ONE_TIME',
        startDate: new Date().toISOString().split('T')[0],
        notes: '',
        description: ''
      });
    }
  }, [request, beneficiaryId, reset]);

  const paymentType = watch('paymentType');

  const onSubmit = async (data: PaymentRequestFormData) => {
    try {
      if (!data.beneficiaryId && !beneficiaryId) {
        alert('Please select a beneficiary');
        return;
      }

      const requestData = {
        ...data,
        beneficiaryId: beneficiaryId || data.beneficiaryId,
        status: 'CREATED' as PaymentRequestStatus
      };

      if (request?.id) {
        const updatedRequest = await paymentRequestServices.update(request.id, requestData);
        // Update store with the returned request
        setPaymentRequests(
          paymentRequests.map(pr => 
            pr.id === request.id ? updatedRequest : pr
          )
        );
      } else {
        const newRequest = await paymentRequestServices.create(requestData);
        // Add the new request to store
        setPaymentRequests([...paymentRequests, newRequest]);
      }
      
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
      
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving payment request:', error);
      alert(error instanceof Error ? error.message : 'Failed to save payment request');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {request ? 'Edit Payment Request' : 'New Payment Request'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {!beneficiaryId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Beneficiary
                </label>
                <BeneficiaryCombobox
                  beneficiaries={activeBeneficiaries}
                  value={watch('beneficiaryId')}
                  onChange={(value) => setValue('beneficiaryId', value)}
                  error={errors.beneficiaryId?.message}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
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
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </div>
                </label>
                <input
                  type="date"
                  {...register('startDate', { required: 'Start date is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                {...register('treasuryId', { required: 'Category is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select a category</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} (${category.balance.toFixed(2)})
                  </option>
                ))}
              </select>
              {errors.treasuryId && (
                <p className="mt-1 text-sm text-red-600">{errors.treasuryId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Payment Type
                </div>
              </label>
              <select
                {...register('paymentType')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="ONE_TIME">One Time</option>
                <option value="RECURRING">Recurring</option>
                <option value="SEASONAL">Seasonal</option>
              </select>
            </div>

            {paymentType !== 'ONE_TIME' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <select
                    {...register('frequency')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    {...register('endDate')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Description
                </div>
              </label>
              <textarea
                {...register('description', {
                  maxLength: { value: 500, message: 'Description cannot exceed 500 characters' }
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Add any relevant details, conditions, or special circumstances..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {watch('description')?.length || 0}/500 characters
              </p>
            </div>

            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {request ? 'Update' : 'Create'} Request
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}