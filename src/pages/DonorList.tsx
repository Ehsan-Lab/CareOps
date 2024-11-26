import React, { useState, useMemo } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { DonorModal } from '../components/modals/DonorModal';
import { donorServices } from '../services/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { Donor } from '../types/donor';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';

const DonorList: React.FC = () => {
  const { isLoading, donors: queryDonors, donorsError } = useFirebaseQuery();
  const donors = queryDonors || [];
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [selectedDonor, setSelectedDonor] = React.useState<Donor | null>(null);
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState<'name' | 'contact'>('name');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedAndFilteredDonors = useMemo(() => {
    return donors
      ?.filter(donor => 
        donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donor.contact.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a[sortField].localeCompare(b[sortField]));
  }, [donors, sortField, searchTerm]);

  React.useEffect(() => {
    console.log('Query Donors:', queryDonors);
    console.log('Current donors state:', donors);
  }, [queryDonors, donors]);

  if (donorsError) {
    return <div className="text-red-600">Error loading donors: {donorsError.message}</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this donor?')) {
      try {
        // Optimistically remove the donor from the UI
        queryClient.setQueryData(['donors'], (old: Donor[] | undefined) => 
          old?.filter(donor => donor.id !== id)
        );

        // Perform the actual delete
        await donorServices.delete(id);
        
        // Refetch to ensure sync
        await queryClient.invalidateQueries({ queryKey: ['donors'] });
      } catch (error) {
        console.error('Error deleting donor:', error);
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ['donors'] });
        alert('Failed to delete donor');
      }
    }
  };

  const handleEdit = (donor: Donor) => {
    setSelectedDonor(donor);
    setIsAddModalOpen(true);
  };

  console.log('Current donors:', donors);

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Donor Management
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your donor profiles and their contributions
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => {
              setSelectedDonor(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Plus className="h-4 w-4" />
            Add Donor
          </button>
        </div>
      </div>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Search donors..."
          className="px-4 py-2 border rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Contact
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {Array.isArray(sortedAndFilteredDonors) && sortedAndFilteredDonors.length > 0 ? (
                    sortedAndFilteredDonors.map((donor) => {
                      console.log('Rendering donor:', donor);
                      return (
                        <tr key={donor.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {donor.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {donor.contact}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex justify-end gap-2">
                              <button
                                className="text-indigo-600 hover:text-indigo-900"
                                onClick={() => handleEdit(donor)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => handleDelete(String(donor.id))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-gray-500">
                        No donors found (Length: {donors?.length})
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <DonorModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedDonor(null);
        }}
        donor={selectedDonor}
      />
    </div>
  );
};

export default DonorList;