import React from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar, DollarSign, FileText, Clock } from 'lucide-react';
import { paymentServices } from '../../services/firebase/paymentService';
import { useQueryClient } from '@tanstack/react-query';
import { Payment } from '../../types';
import { BeneficiaryCombobox } from '../BeneficiaryCombobox';
import { useAllData } from '../../hooks/useFirebaseQuery';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment?: Payment | null;
  beneficiaryId?: string;
}

interface PaymentFormData {
  beneficiaryId: string;
  amount: string;
  categoryId: string;
  date: string;
  paymentType: 'ONE_TIME' | 'RECURRING';
  notes: string;
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  repetitions?: string;
  description: string;
}

export function PaymentModal({ isOpen, onClose, payment, beneficiaryId }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAllData();
  const treasuryCategories = data?.treasury || [];
  const beneficiaries = data?.beneficiaries || [];

  const defaultValues: PaymentFormData = payment ? {
    beneficiaryId: payment.beneficiaryId,
    amount: String(payment.amount),
    categoryId: payment.categoryId,
    date: payment.date,
    paymentType: payment.paymentType === 'SEASONAL' ? 'ONE_TIME' : payment.paymentType as 'ONE_TIME' | 'RECURRING',
    notes: payment.notes || '',
    description: payment.notes || ''
  } : {
    beneficiaryId: beneficiaryId || '',
    amount: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    paymentType: 'ONE_TIME',
    notes: '',
    description: ''
  };

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PaymentFormData>({
    defaultValues
  });

  React.useEffect(() => {
    if (payment) {
      reset({
        beneficiaryId: payment.beneficiaryId,
        amount: String(payment.amount),
        categoryId: payment.categoryId,
        date: payment.date,
        paymentType: payment.paymentType === 'SEASONAL' ? 'ONE_TIME' : payment.paymentType as 'ONE_TIME' | 'RECURRING',
        notes: payment.notes || '',
        description: payment.notes || ''
      });
    } else {
      reset({
        beneficiaryId: beneficiaryId || '',
        amount: '',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
        paymentType: 'ONE_TIME',
        notes: '',
        description: ''
      });
    }
  }, [payment, beneficiaryId, reset]);

  const paymentType = watch('paymentType');
  const activeBeneficiaries = beneficiaries.filter(b => b.status === 'ACTIVE');
  const availableCategories = treasuryCategories.filter(c => c.balance > 0);

  const onSubmit = async (formData: PaymentFormData) => {
    try {
      if (!formData.beneficiaryId && !beneficiaryId) {
        alert('Please select a beneficiary');
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than 0');
        return;
      }

      // For recurring payments, validate frequency and repetitions
      if (formData.paymentType === 'RECURRING') {
        if (!formData.frequency) {
          alert('Please select a frequency for recurring payments');
          return;
        }
        if (!formData.repetitions || parseInt(formData.repetitions) < 1) {
          alert('Please enter a valid number of repetitions');
          return;
        }
      }

      // Calculate total amount for recurring payments
      const repetitions = formData.paymentType === 'RECURRING' ? parseInt(formData.repetitions || '1') : 1;
      const totalAmount = amount * repetitions;

      // Validate if category has sufficient balance
      const selectedCategory = treasuryCategories.find(c => c.id === formData.categoryId);
      if (!selectedCategory) {
        alert('Selected category not found');
        return;
      }
      if (selectedCategory.balance < totalAmount) {
        alert(`Insufficient funds in category. Required: $${totalAmount.toFixed(2)}, Available: $${selectedCategory.balance.toFixed(2)}`);
        return;
      }

      const basePaymentData = {
        amount: amount,
        beneficiaryId: beneficiaryId || formData.beneficiaryId,
        categoryId: formData.categoryId,
        treasuryId: formData.categoryId,
        representativeId: 'SYSTEM',
        status: 'PENDING' as const,
        description: formData.description,
        notes: formData.notes,
        paymentType: formData.paymentType
      };

      if (payment?.id) {
        await paymentServices.update(payment.id.toString(), basePaymentData);
      } else {
        if (formData.paymentType === 'RECURRING') {
          // Create multiple pending payments
          const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
            ...basePaymentData,
            date: formData.date,
            frequency: formData.frequency,
            totalRepetitions: repetitions,
            description: formData.description
          };
          await paymentServices.create(paymentData);
        } else {
          // Create single one-time payment
          const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
            ...basePaymentData,
            date: formData.date
          };
          await paymentServices.create(paymentData);
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['all-data'] });
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert(error instanceof Error ? error.message : 'Failed to save payment');
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
              {payment ? 'Edit Payment' : 'New Payment'}
            </h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-500"
              title="Close modal"
            >
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
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
                  disabled={isLoading}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                {...register('categoryId', { required: 'Category is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={isLoading}
              >
                <option value="">Select a category</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} (${category.balance.toFixed(2)})
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
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
                disabled={isLoading}
              >
                <option value="ONE_TIME">One Time</option>
                <option value="RECURRING">Recurring</option>
              </select>
            </div>

            {paymentType === 'RECURRING' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <select
                    {...register('frequency', {
                      required: {
                        value: paymentType === 'RECURRING',
                        message: 'Frequency is required for recurring payments'
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={isLoading}
                  >
                    <option value="">Select frequency</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {errors.frequency && (
                    <p className="mt-1 text-sm text-red-600">{errors.frequency.message || 'Frequency is required'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Repetitions
                  </label>
                  <input
                    type="number"
                    min="1"
                    {...register('repetitions', {
                      required: {
                        value: paymentType === 'RECURRING',
                        message: 'Number of repetitions is required for recurring payments'
                      },
                      min: { 
                        value: 1, 
                        message: 'Must be at least 1 repetition' 
                      }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={isLoading}
                    placeholder="Enter number of repetitions"
                  />
                  {errors.repetitions && (
                    <p className="mt-1 text-sm text-red-600">{errors.repetitions.message || 'Number of repetitions is required'}</p>
                  )}
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
                  required: 'Description is required',
                  minLength: { value: 3, message: 'Description must be at least 3 characters' }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
                disabled={isLoading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
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
                {isLoading ? 'Loading...' : payment ? 'Update Payment' : 'Add Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}