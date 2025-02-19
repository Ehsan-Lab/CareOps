import React from 'react';
import { Heart, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { DonationModal } from '../components/modals/DonationModal';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { Donation, Donor, TreasuryCategory } from '../types';
import { logger } from '../utils/logger';

const DonationList: React.FC = () => {
  const { donations: donationsData, donors, treasuryCategories, isLoading, error } = useFirebaseQuery();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [deletingIds, setDeletingIds] = React.useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  // Extract the donations array from the donations object
  const donations = Array.isArray(donationsData) ? donationsData : (donationsData?.donations || []);

  const getDonorName = (donorId: string) => {
    const donor = donors?.find((d: Donor) => d.id === donorId);
    return donor?.name || 'Unknown Donor';
  };

  const getCategoryName = (categoryId: string) => {
    const category = treasuryCategories?.find((c: TreasuryCategory) => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const handleDelete = (id: string) => {
    // Implement delete logic here
    logger.debug('Delete clicked for donation', { id }, 'DonationList');
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const filteredAndSortedDonations = React.useMemo(() => {
    logger.debug('Processing donations', { 
      count: donations?.length,
      selectedCategory,
      sortDirection 
    }, 'DonationList');

    if (!Array.isArray(donations)) {
      logger.warn('Donations is not an array', { donations }, 'DonationList');
      return [];
    }

    let filtered = [...donations];
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((donation: Donation) => donation.categoryId === selectedCategory);
    }

    // Sort by date
    filtered.sort((a: Donation, b: Donation) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [donations, selectedCategory, sortDirection]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading donations. Please try again later.
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-600" />
            Donation Management
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Track and manage all donations and their allocations
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <Plus className="h-4 w-4" />
            Add Donation
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mt-4 flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
            Filter by Category:
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 py-1.5 text-gray-900 shadow-sm focus:border-rose-500 focus:ring-rose-500 sm:text-sm"
          >
            <option value="all">All Categories</option>
            {treasuryCategories?.map((category: TreasuryCategory) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Donor
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Purpose
                    </th>
                    <th 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={toggleSortDirection}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        {sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredAndSortedDonations.map((donation) => (
                    <tr key={donation.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {getDonorName(donation.donorId)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${Number(donation.amount).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {getCategoryName(donation.categoryId)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {donation.purpose}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {format(new Date(donation.date), 'MMM d, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {deletingIds.includes(donation.id) ? (
                          <span className="text-gray-400">Deleting...</span>
                        ) : (
                          <button
                            onClick={() => handleDelete(donation.id)}
                            disabled={deletingIds.includes(donation.id)}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <DonationModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default DonationList;