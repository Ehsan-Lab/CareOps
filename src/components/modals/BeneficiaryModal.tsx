import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { beneficiaryServices } from '../../services/firebase/beneficiaryService';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../../store';
import { Beneficiary, SupportType } from '../../types';

interface BeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiary?: Beneficiary | null;
}

interface BeneficiaryFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  supportType: SupportType;
}

export const BeneficiaryModal: React.FC<BeneficiaryModalProps> = ({
  isOpen,
  onClose,
  beneficiary
}) => {
  const queryClient = useQueryClient();
  const { setBeneficiaries, beneficiaries } = useStore();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BeneficiaryFormData>({
    defaultValues: beneficiary ? {
      name: beneficiary.name,
      email: beneficiary.email,
      phone: beneficiary.phone,
      address: beneficiary.address,
      supportType: beneficiary.supportType
    } : {
      name: '',
      email: '',
      phone: '',
      address: '',
      supportType: 'FOOD'
    }
  });

  React.useEffect(() => {
    if (beneficiary) {
      reset({
        name: beneficiary.name,
        email: beneficiary.email,
        phone: beneficiary.phone,
        address: beneficiary.address,
        supportType: beneficiary.supportType
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        address: '',
        supportType: 'FOOD'
      });
    }
  }, [beneficiary, reset]);

  const onSubmit = async (data: BeneficiaryFormData) => {
    try {
      if (beneficiary?.id) {
        const updatedBeneficiary = await beneficiaryServices.update(beneficiary.id, data);
        setBeneficiaries(
          beneficiaries.map(b => 
            b.id === beneficiary.id ? updatedBeneficiary : b
          )
        );
      } else {
        const newBeneficiary = await beneficiaryServices.create(data);
        setBeneficiaries([...beneficiaries, newBeneficiary]);
      }
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
      onClose();
    } catch (error) {
      console.error('Error saving beneficiary:', error);
      alert('Failed to save beneficiary');
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
              {beneficiary ? 'Edit' : 'New'} Beneficiary
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                {...register('phone', { required: 'Phone is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                {...register('address', { required: 'Address is required' })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Support Type</label>
              <select
                {...register('supportType', { required: 'Support type is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              >
                <option value="MEDICAL">Medical Support</option>
                <option value="EDUCATION">Education Support</option>
                <option value="FOOD">Food Support</option>
                <option value="HOUSING">Housing Support</option>
                <option value="EMERGENCY">Emergency Support</option>
              </select>
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
                {beneficiary ? 'Update' : 'Create'} Beneficiary
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 