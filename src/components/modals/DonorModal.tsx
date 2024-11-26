import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { donorServices } from '../../services/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { Donor } from '../../types/donor';
import { validateFirebaseConnection } from '../../config/firebase';

interface DonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor?: Donor | null;
}

interface DonorFormData {
  name: string;
  contact: string;
}

export const DonorModal: React.FC<DonorModalProps> = ({ isOpen, onClose, donor }) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DonorFormData>({
    defaultValues: donor || { name: '', contact: '' }
  });

  React.useEffect(() => {
    if (donor) {
      reset(donor);
    } else {
      reset({ name: '', contact: '' });
    }
  }, [donor, reset]);

  const onSubmit = async (data: DonorFormData) => {
    try {
      const isConnected = await validateFirebaseConnection();
      if (!isConnected) {
        throw new Error('Firebase connection failed');
      }

      if (donor?.id) {
        console.log('Updating donor:', donor.id, data);
        await donorServices.update(donor.id, data);
      } else {
        console.log('Creating new donor:', data);
        await donorServices.create(data);
      }
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      reset();
      onClose();
    } catch (error) {
      console.error('Detailed error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save donor: ${errorMessage}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">{donor ? 'Edit' : 'Add'} Donor</h3>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact</label>
              <input
                type="text"
                {...register('contact', { required: 'Contact is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.contact && (
                <p className="mt-1 text-sm text-red-600">{errors.contact.message}</p>
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
                disabled={isSubmitting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : donor ? 'Update' : 'Add'} Donor
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};