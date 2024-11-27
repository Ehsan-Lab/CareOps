import React from 'react';
import { Plus, Ban, Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { PaymentModal } from '../components/modals/PaymentModal';
import { paymentServices } from '../services/firebase';
import { Payment, PaymentType, PaymentStatus } from '../types';
import { format } from 'date-fns';

function PaymentList() {
  const { payments = [], treasuryCategories = [], beneficiaries = [] } = useFirebaseQuery();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const queryClient = useQueryClient();

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this payment?')) {
      try {
        await paymentServices.cancel(id);
        queryClient.invalidateQueries({ queryKey: ['payments'] });
        queryClient.invalidateQueries({ queryKey: ['treasury'] });
      } catch (error) {
        console.error('Error cancelling payment:', error);
        alert(error instanceof Error ? error.message : 'Failed to cancel payment');
      }
    }
  };

  const getBeneficiaryName = (id: string) => {
    const beneficiary = beneficiaries.find(b => b.id === id);
    return beneficiary?.name || 'Unknown Beneficiary';
  };

  const getCategoryName = (id: string) => {
    const category = treasuryCategories.find(c => c.id === id);
    return category?.name || 'Unknown Category';
  };

  const getPaymentTypeColor = (type: PaymentType) => {
    switch (type) {
      case 'ONE_TIME':
        return 'bg-blue-100 text-blue-800';
      case 'SEASONAL':
        return 'bg-green-100 text-green-800';
      case 'RECURRING':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage payments to beneficiaries
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setSelectedPayment(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payment
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
                      Beneficiary
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Type
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
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {format(new Date(payment.date), 'MMM d, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {getBeneficiaryName(payment.beneficiaryId)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {getCategoryName(payment.categoryId)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getPaymentTypeColor(payment.paymentType)}`}>
                          {payment.paymentType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          {payment.status !== 'CANCELLED' && (
                            <>
                              <button
                                className="text-emerald-600 hover:text-emerald-900"
                                onClick={() => handleEdit(payment)}
                                title="Edit Payment"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900"
                                onClick={() => handleCancel(payment.id)}
                                title="Cancel Payment"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </>
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

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />
    </div>
  );
}

export default PaymentList; 