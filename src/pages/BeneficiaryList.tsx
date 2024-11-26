import React from 'react';
import { Users, Plus, Pencil, Ban } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { BeneficiaryModal } from '../components/modals/BeneficiaryModal';
import { beneficiaryServices } from '../services/firebase';
import { Beneficiary } from '../types';

const BeneficiaryList: React.FC = () => {
  const { beneficiaries = [] } = useFirebaseQuery();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = React.useState<Beneficiary | null>(null);
  const queryClient = useQueryClient();

  const handleEdit = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setIsModalOpen(true);
  };

  const handleDeactivate = async (id: string) => {
    if (window.confirm('Are you sure you want to deactivate this beneficiary?')) {
      try {
        await beneficiaryServices.delete(id);
        queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      } catch (error) {
        console.error('Error deactivating beneficiary:', error);
        alert('Failed to deactivate beneficiary');
      }
    }
  };

  const getSupportTypeColor = (type: string) => {
    switch (type) {
      case 'MEDICAL':
        return 'bg-blue-100 text-blue-800';
      case 'EDUCATION':
        return 'bg-purple-100 text-purple-800';
      case 'FOOD':
        return 'bg-green-100 text-green-800';
      case 'HOUSING':
        return 'bg-yellow-100 text-yellow-800';
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeBeneficiaries = beneficiaries.filter(b => b.status === 'ACTIVE');

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            Beneficiaries
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage beneficiaries and their support types
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => {
              setSelectedBeneficiary(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Add Beneficiary
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
                      Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Contact
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Support Type
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Address
                    </th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {activeBeneficiaries.map((beneficiary) => (
                    <tr key={beneficiary.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {beneficiary.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div>
                          <div>{beneficiary.phone}</div>
                          <div className="text-xs text-gray-400">{beneficiary.email}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getSupportTypeColor(beneficiary.supportType)}`}>
                          {beneficiary.supportType}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {beneficiary.address}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            className="text-emerald-600 hover:text-emerald-900"
                            onClick={() => handleEdit(beneficiary)}
                            title="Edit Beneficiary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeactivate(beneficiary.id)}
                            title="Deactivate Beneficiary"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
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

      <BeneficiaryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBeneficiary(null);
        }}
        beneficiary={selectedBeneficiary}
      />
    </div>
  );
};

export default BeneficiaryList; 