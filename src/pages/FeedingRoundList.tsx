import React from 'react';
import { Utensils, Plus, Play, CheckCircle, Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { FeedingRoundModal } from '../components/modals/FeedingRoundModal';
import { feedingRoundServices } from '../services/firebase';
import { format } from 'date-fns';
import { FeedingRound } from '../types';

const FeedingRoundList: React.FC = () => {
  const { feedingRounds = [] } = useFirebaseQuery();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedRound, setSelectedRound] = React.useState<FeedingRound | null>(null);
  const queryClient = useQueryClient();

  const handleEdit = (round: FeedingRound) => {
    setSelectedRound(round);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = async (id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await feedingRoundServices.updateStatus(id, status);
      queryClient.invalidateQueries({ queryKey: ['feedingRounds'] });
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
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
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Date
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
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
                  {feedingRounds.map((round) => (
                    <tr key={round.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {format(new Date(round.date), 'MMM d, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${round.allocatedAmount.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(round.status)}`}>
                          {round.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          {round.status === 'PENDING' && (
                            <button
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleStatusUpdate(round.id, 'IN_PROGRESS')}
                              title="Start Round"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {round.status === 'IN_PROGRESS' && (
                            <button
                              className="text-green-600 hover:text-green-900"
                              onClick={() => handleStatusUpdate(round.id, 'COMPLETED')}
                              title="Complete Round"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {round.status === 'PENDING' && (
                            <button
                              className="text-emerald-600 hover:text-emerald-900"
                              onClick={() => handleEdit(round)}
                              title="Edit Round"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <FeedingRoundModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRound(null);
        }}
        round={selectedRound}
      />
    </div>
  );
};

export default FeedingRoundList;