import React from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar, DollarSign, FileText, Clock } from 'lucide-react';
import { paymentServices } from '../../services/firebase/paymentService';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';
import { Payment, PaymentType } from '../../types';
import { BeneficiaryCombobox } from '../BeneficiaryCombobox';

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
  paymentType: PaymentType;
  notes: string;
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  description: string;
}

export function PaymentModal({ isOpen, onClose, payment, beneficiaryId }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const { treasuryCategories, beneficiaries, setPayments, payments } = useStore();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PaymentFormData>({
    defaultValues: payment ? {
      beneficiaryId: payment.beneficiaryId,
      amount: String(payment.amount),
      categoryId: payment.categoryId,
      date: payment.date,
      paymentType: payment.paymentType,
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
    }
  });

  React.useEffect(() => {
    if (payment) {
      reset({
        beneficiaryId: payment.beneficiaryId,
        amount: String(payment.amount),
        categoryId: payment.categoryId,
        date: payment.date,
        paymentType: payment.paymentType,
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

  const onSubmit = async (data: PaymentFormData) => {
    try {
      if (!data.beneficiaryId && !beneficiaryId) {
        alert('Please select a beneficiary');
        return;
      }

      const paymentData = {
        ...data,
        amount: parseFloat(data.amount),
        beneficiaryId: beneficiaryId || data.beneficiaryId,
        categoryId: data.categoryId,
        representativeId: 'SYSTEM'
      };

      if (payment?.id) {
        const updatedPayment = await paymentServices.update(payment.id.toString(), paymentData) as Payment;
        setPayments(
          payments.map(p => 
            p.id === payment.id ? { ...p, ...updatedPayment } : p
          )
        );
      } else {
        const newPayment = await paymentServices.create(paymentData) as Payment;
        if (newPayment) {
          setPayments([...payments, newPayment]);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                {...register('categoryId', { required: 'Category is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
              >
                <option value="ONE_TIME">One Time</option>
                <option value="RECURRING">Recurring</option>
                <option value="SEASONAL">Seasonal</option>
              </select>
            </div>

            {paymentType !== 'ONE_TIME' && (
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
                {payment ? 'Update' : 'Create'} Payment
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