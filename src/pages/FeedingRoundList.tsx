import React, { useState, useMemo } from 'react';
import { Utensils, Plus, Play, CheckCircle, Pencil, Trash2, Camera, ImageOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAllData } from '../hooks/useFirebaseQuery';
import { FeedingRoundModal } from '../components/modals/FeedingRoundModal';
import { FeedingRoundPhotosModal } from '../components/modals/FeedingRoundPhotosModal';
import { feedingRoundServices } from '../services/firebase/feedingRoundService';
import { format } from 'date-fns';
import { FeedingRound, Donor, Beneficiary, Donation, Payment, TreasuryCategory, Transaction } from '../types';
import { DocumentSnapshot, DocumentData } from 'firebase/firestore';
import { logger } from '../utils/logger';

interface PaginatedFeedingRounds {
  rounds: FeedingRound[];
  lastDoc: DocumentSnapshot<DocumentData> | null;
}

interface AllData {
  feedingRounds: PaginatedFeedingRounds;
  donors: Donor[];
  beneficiaries: Beneficiary[];
  donations: Donation[];
  payments: Payment[];
  treasury: TreasuryCategory[];
  transactions: { transactions: Transaction[]; lastDoc: DocumentSnapshot | null };
}

const FeedingRoundList: React.FC = () => {
  const { data, isLoading, error } = useAllData();
  const feedingRounds = data?.feedingRounds || { rounds: [], lastDoc: null };
  console.log('FeedingRoundList: Initial feedingRounds:', feedingRounds);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = React.useState(false);
  const [selectedRound, setSelectedRound] = React.useState<FeedingRound | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'allocatedAmount' | 'unitPrice' | 'units'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Validate and transform feeding rounds data
  const validFeedingRounds = useMemo(() => {
    logger.debug('Processing feeding rounds', { count: feedingRounds?.rounds?.length }, 'FeedingRoundList');

    if (!feedingRounds?.rounds) {
      logger.warn('No rounds array in feedingRounds', { feedingRounds }, 'FeedingRoundList');
      return [];
    }

    const filtered = feedingRounds.rounds.filter(round => {
      if (!round) {
        logger.warn('Invalid round object', { round }, 'FeedingRoundList');
        return false;
      }

      if (!round.id) {
        logger.warn('Missing or invalid id', { round }, 'FeedingRoundList');
        return false;
      }

      if (!round.categoryId) {
        logger.warn('Missing or invalid categoryId', { round }, 'FeedingRoundList');
        return false;
      }

      if (!round.createdAt) {
        logger.warn('Invalid date, using current date', { round }, 'FeedingRoundList');
        return false;
      }

      if (!round.allocatedAmount || round.allocatedAmount <= 0) {
        logger.warn('Invalid allocatedAmount', { round }, 'FeedingRoundList');
        return false;
      }

      if (!round.unitPrice || round.unitPrice <= 0) {
        logger.warn('Invalid unitPrice', { round }, 'FeedingRoundList');
        return false;
      }

      if (!Array.isArray(round.photos)) {
        logger.warn('Invalid photos array', { round }, 'FeedingRoundList');
        return false;
      }

      if (!['PENDING', 'COMPLETED', 'CANCELLED'].includes(round.status)) {
        logger.warn('Invalid status', { round }, 'FeedingRoundList');
        return false;
      }

      return true;
    });

    logger.debug('Filtered rounds', { count: filtered.length }, 'FeedingRoundList');
    return filtered;
  }, [feedingRounds]);

  const sortedRounds = React.useMemo(() => {
    console.log('FeedingRoundList: Sorting rounds, count:', validFeedingRounds.length);
    if (!validFeedingRounds.length) return [];
    
    return [...validFeedingRounds].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
          break;
        case 'allocatedAmount':
          comparison = (a.allocatedAmount || 0) - (b.allocatedAmount || 0);
          break;
        case 'unitPrice':
          comparison = (a.unitPrice || 0) - (b.unitPrice || 0);
          break;
        case 'units': {
          const unitsA = a.unitPrice > 0 ? (a.allocatedAmount || 0) / a.unitPrice : 0;
          const unitsB = b.unitPrice > 0 ? (b.allocatedAmount || 0) / b.unitPrice : 0;
          comparison = unitsA - unitsB;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [validFeedingRounds, sortField, sortDirection]);

  React.useEffect(() => {
    console.log('FeedingRoundList: useEffect - lastDoc update:', feedingRounds.lastDoc);
    if (feedingRounds.lastDoc) {
      setLastDoc(feedingRounds.lastDoc);
      setHasMore(true);
    } else {
      setHasMore(false);
    }
  }, [feedingRounds.lastDoc]);

  const loadMore = async () => {
    if (!hasMore || !lastDoc) return;

    try {
      logger.debug('Loading more rounds', { lastDoc: feedingRounds?.lastDoc }, 'FeedingRoundList');
      const result = await feedingRoundServices.getAll(10, lastDoc);
      
      // Update the query cache with the combined results
      queryClient.setQueryData<AllData>(['all-data'], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          feedingRounds: {
            rounds: [...(oldData.feedingRounds.rounds || []), ...result.rounds],
            lastDoc: result.lastDoc
          }
        };
      });

      if (result.lastDoc) {
        setLastDoc(result.lastDoc);
        setHasMore(result.rounds.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      logger.error('Error loading more rounds', error, 'FeedingRoundList');
      setHasMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading feeding rounds. Please try again later.
      </div>
    );
  }

  const handleEdit = (round: FeedingRound) => {
    setSelectedRound(round);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      logger.debug('Updating round status', { id, newStatus }, 'FeedingRoundList');
      setUpdatingStatus(id);
      // Optimistic update
      const updatedRounds = validFeedingRounds.map(round => 
        round.id === id ? { ...round, status: newStatus } : round
      );
      queryClient.setQueryData<AllData>(['all-data'], (oldData) => ({
        ...oldData!,
        feedingRounds: { rounds: updatedRounds, lastDoc }
      }));

      await feedingRoundServices.updateStatus(id, newStatus);
      
      // Invalidate and refetch all relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['all-data'] }),
        queryClient.refetchQueries({ queryKey: ['all-data'] })
      ]);
    } catch (error) {
      logger.error('Error updating status', error, 'FeedingRoundList');
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this feeding round?')) {
      setIsDeleting(id);
      try {
        logger.debug('Deleting feeding round', { id }, 'FeedingRoundList');
        // Optimistic update
        const updatedRounds = validFeedingRounds.filter(round => round.id !== id);
        queryClient.setQueryData<AllData>(['all-data'], (oldData) => ({
          ...oldData!,
          feedingRounds: { rounds: updatedRounds, lastDoc }
        }));

        await feedingRoundServices.delete(id);
        
        // Invalidate and refetch all relevant queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['all-data'] }),
          queryClient.refetchQueries({ queryKey: ['all-data'] })
        ]);

        // Clean up expanded state
        setExpandedId(null);
      } catch (error) {
        logger.error('Error deleting feeding round', error, 'FeedingRoundList');
        // Revert optimistic update
        queryClient.invalidateQueries({ queryKey: ['all-data'] });
        alert('Failed to delete feeding round');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleViewPhotos = (round: FeedingRound) => {
    setSelectedRound(round);
    setIsPhotosModalOpen(true);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Utensils className="h-6 w-6 text-emerald-600" />
            Feeding Rounds
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage feeding rounds and track their status
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => {
              setSelectedRound(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            New Round
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        <SortIcon field="date" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('allocatedAmount')}
                    >
                      <div className="flex items-center gap-1">
                        Amount
                        <SortIcon field="allocatedAmount" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('unitPrice')}
                    >
                      <div className="flex items-center gap-1">
                        Unit Price
                        <SortIcon field="unitPrice" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                      onClick={() => handleSort('units')}
                    >
                      <div className="flex items-center gap-1">
                        Units
                        <SortIcon field="units" />
                      </div>
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedRounds.map((round) => {
                    if (!round || typeof round !== 'object') return null;

                    const units = (typeof round.unitPrice === 'number' && round.unitPrice > 0) ? 
                      (typeof round.allocatedAmount === 'number' ? round.allocatedAmount / round.unitPrice : 0) : 0;
                    const isExpanded = expandedId === round.id;

                    return (
                      <React.Fragment key={round.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {format(new Date(round.date), 'MMM d, yyyy')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            ${typeof round.allocatedAmount === 'number' ? round.allocatedAmount.toFixed(2) : '0.00'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {typeof round.unitPrice === 'number' ? `$${round.unitPrice.toFixed(2)}` : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {units > 0 ? units.toFixed(2) : 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(round.status)}`}>
                              {round.status}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex justify-end gap-2">
                              <button
                                className="text-gray-600 hover:text-gray-900"
                                onClick={() => setExpandedId(isExpanded ? null : round.id)}
                                title={isExpanded ? "Hide Details" : "Show Details"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              {round.status === 'PENDING' && (
                                <button
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleStatusUpdate(round.id, 'IN_PROGRESS')}
                                  disabled={updatingStatus === round.id}
                                  title="Start Round"
                                >
                                  {updatingStatus === round.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              {round.status === 'IN_PROGRESS' && (
                                <button
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleStatusUpdate(round.id, 'COMPLETED')}
                                  disabled={updatingStatus === round.id}
                                  title="Complete Round"
                                >
                                  {updatingStatus === round.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              {round.status !== 'COMPLETED' && (
                                <>
                                  <button
                                    className="text-emerald-600 hover:text-emerald-900"
                                    onClick={() => handleEdit(round)}
                                    title="Edit Round"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleDelete(round.id)}
                                    disabled={isDeleting === round.id}
                                    title="Delete Round"
                                  >
                                    {isDeleting === round.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </>
                              )}
                              {round.status === 'COMPLETED' && (
                                <button
                                  className="text-purple-600 hover:text-purple-900"
                                  onClick={() => handleViewPhotos(round)}
                                  title={round.driveLink ? "View Photos" : "Add Photos"}
                                >
                                  {round.driveLink ? (
                                    <Camera className="h-4 w-4" />
                                  ) : (
                                    <ImageOff className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-sm text-gray-500 bg-gray-50">
                              <div className="space-y-2">
                                {round.description && (
                                  <div>
                                    <span className="font-medium">Description:</span> {round.description}
                                  </div>
                                )}
                                {round.observations && (
                                  <div>
                                    <span className="font-medium">Observations:</span> {round.observations}
                                  </div>
                                )}
                                {round.specialCircumstances && (
                                  <div>
                                    <span className="font-medium">Special Circumstances:</span> {round.specialCircumstances}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Load More
          </button>
        </div>
      )}

      <FeedingRoundModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRound(null);
        }}
        round={selectedRound}
      />

      {selectedRound && (
        <FeedingRoundPhotosModal
          isOpen={isPhotosModalOpen}
          onClose={() => {
            setIsPhotosModalOpen(false);
            setSelectedRound(null);
          }}
          round={selectedRound}
        />
      )}
    </div>
  );
};

export default FeedingRoundList;