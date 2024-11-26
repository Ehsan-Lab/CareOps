import React from 'react';
import { Utensils, Plus } from 'lucide-react';
import { useStore } from '../store';
import { format } from 'date-fns';
import { FeedingRoundModal } from '../components/modals/FeedingRoundModal';
import { feedingRoundServices } from '../services/firebase';
import { useQueryClient } from '@tanstack/react-query';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const FeedingRoundList: React.FC = () => {
  const feedingRounds = useStore((state) => state.feedingRounds);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await feedingRoundServices.updateStatus(id, status as any);
      queryClient.invalidateQueries({ queryKey: ['feedingRounds'] });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Utensils className="h-6 w-6 text-emerald-600" />
            Feeding Ground Management
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage feeding rounds and track their progress
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <Plus className="h-4 w-4" />
            New Feeding Round
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
                      Allocated Amount
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Actions
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            statusColors[round.status]
                          }`}
                        >
                          {round.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <select
                          value={round.status}
                          onChange={(e) => handleStatusChange(round.id, e.target.value)}
                          className="rounded-md border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <FeedingRoundModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
};

export default FeedingRoundList;