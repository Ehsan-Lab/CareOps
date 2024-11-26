import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { treasuryServices } from '../../services/firebase';
import { useQueryClient } from '@tanstack/react-query';

interface TreasuryCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TreasuryCategoryModal: React.FC<TreasuryCategoryModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: ''
    }
  });

  const onSubmit = async (data: { name: string }) => {
    try {
      await treasuryServices.create(data);
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      onClose();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">New Treasury Category</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category Name</label>
              <input
                type="text"
                {...register('name', { required: 'Category name is required' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Create Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};