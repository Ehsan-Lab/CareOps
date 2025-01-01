import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { treasuryServices } from '../../services/firebase/treasuryService';
import { useQueryClient } from '@tanstack/react-query';

interface TreasuryCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: {
    id: string;
    name: string;
    balance: number;
  } | null;
}

interface CategoryFormData {
  name: string;
}

export const TreasuryCategoryModal: React.FC<TreasuryCategoryModalProps> = ({ 
  isOpen, 
  onClose, 
  category 
}) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>({
    defaultValues: category || { name: '' }
  });

  React.useEffect(() => {
    if (category) {
      reset({ name: category.name });
    } else {
      reset({ name: '' });
    }
  }, [category, reset]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (category?.id) {
        await treasuryServices.update(category.id, data);
      } else {
        await treasuryServices.create({
          ...data,
          balance: 0
        });
      }
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
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
              {category ? 'Edit' : 'New'} Treasury Category
            </h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-500"
              title="Close modal"
            >
              <X className="h-5 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
                <span className="text-xs text-gray-500 ml-1">
                  (Use "Feeding" for feeding rounds)
                </span>
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                placeholder="e.g., Feeding, Medical, Education"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
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
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {category ? 'Update' : 'Create'} Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};