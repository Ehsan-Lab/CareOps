import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { paymentServices } from '../../services/firebase/paymentService';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';
import { Payment, PaymentType } from '../../types';

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
}

export function PaymentModal({ isOpen, onClose, payment, beneficiaryId }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const { treasuryCategories, beneficiaries } = useStore();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<PaymentFormData>({
    defaultValues: payment ? {
      beneficiaryId: payment.beneficiaryId,
      amount: String(payment.amount),
      categoryId: payment.categoryId,
      date: payment.date,
      paymentType: payment.paymentType,
      notes: payment.notes || ''
    } : {
      beneficiaryId: beneficiaryId || '',
      amount: '',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
      paymentType: 'ONE_TIME',
      notes: ''
    }
  });

  React.useEffect(() => {
    console.log('PaymentModal mounted with beneficiaries:', beneficiaries);
  }, []);

  const activeBeneficiaries = React.useMemo(() => {
    console.log('Filtering beneficiaries:', beneficiaries);
    if (!beneficiaries?.length) {
      console.log('No beneficiaries to filter');
      return [];
    }

    const filtered = beneficiaries.filter(b => {
      const isActive = b.status === 'ACTIVE';
      console.log(`Beneficiary ${b.id} (${b.name}) status:`, b.status, 'isActive:', isActive);
      return isActive;
    });

    console.log('Filtered beneficiaries:', filtered);
    return filtered;
  }, [beneficiaries]);

  const availableCategories = React.useMemo(() => 
    treasuryCategories.filter(c => c.balance > 0),
    [treasuryCategories]
  );

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
        treasuryId: data.categoryId,
        representativeId: 'SYSTEM'
      };

      if (payment?.id) {
        await paymentServices.update(payment.id, paymentData);
      } else {
        await paymentServices.create(paymentData);
      }
      
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert(error instanceof Error ? error.message : 'Failed to save payment');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                {payment ? 'Edit Payment' : 'New Payment'}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
            {!beneficiaryId && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Beneficiary</label>
                <select
                  {...register('beneficiaryId', { required: 'Beneficiary is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                >
                  <option value="">Select a beneficiary</option>
                  {activeBeneficiaries?.map((beneficiary) => (
                    <option key={beneficiary.id} value={beneficiary.id}>
                      {beneficiary.name} ({beneficiary.supportType})
                    </option>
                  ))}
                </select>
                {errors.beneficiaryId && (
                  <p className="mt-1 text-sm text-red-600">{errors.beneficiaryId.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                {...register('categoryId', { required: 'Category is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
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
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { 
                  required: 'Amount is required',
                  min: { value: 0, message: 'Amount must be positive' }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

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
              <label className="block text-sm font-medium text-gray-700">Payment Type</label>
              <select
                {...register('paymentType', { required: 'Payment type is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              >
                <option value="ONE_TIME">One Time</option>
                <option value="SEASONAL">Seasonal</option>
                <option value="RECURRING">Recurring</option>
              </select>
              {errors.paymentType && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {payment ? 'Update' : 'Create'} Payment
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
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