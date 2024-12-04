import React from 'react';
import { ChevronDown, ChevronUp, Clock, Trash2 } from 'lucide-react';
import { Payment, PaymentStatus, PaymentType } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { useStore } from '../store';
import { paymentServices } from '../services/firebase/paymentService';
import { useQueryClient } from '@tanstack/react-query';

interface PaymentTableProps {
  payments: Payment[];
  selectedPayments: string[];
  onSelectPayment: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  getBeneficiaryName: (id: string) => string;
  getCategoryName: (id: string) => string;
}

export function PaymentTable({
  payments,
  selectedPayments,
  onSelectPayment,
  onSelectAll,
  expandedId,
  onToggleExpand,
  getBeneficiaryName,
  getCategoryName
}: PaymentTableProps) {
  const queryClient = useQueryClient();
  const { user } = useStore();

  const handleDelete = async (payment: Payment) => {
    if (!window.confirm(`Are you sure you want to delete this ${payment.status.toLowerCase()} payment? This action cannot be undone.${payment.status === 'COMPLETED' ? ' The amount will be refunded to the treasury.' : ''}`)) {
      return;
    }

    try {
      await paymentServices.delete(payment.id, user?.uid || 'SYSTEM');
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment: ' + (error as Error).message);
    }
  };

  const getPaymentTypeColor = (type: PaymentType) => {
    switch (type) {
      case 'ONE_TIME': return 'bg-blue-100 text-blue-800';
      case 'SEASONAL': return 'bg-green-100 text-green-800';
      case 'RECURRING': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <table className="min-w-full divide-y divide-gray-300">
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
            <input
              type="checkbox"
              className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
              checked={selectedPayments.length === payments.length}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
          </th>
          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
            Transaction ID
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
          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
            Date
          </th>
          <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {payments.map(payment => (
          <React.Fragment key={payment.id}>
            <tr className={selectedPayments.includes(payment.id) ? 'bg-gray-50' : undefined}>
              <td className="relative px-7 sm:w-12 sm:px-6">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
                  checked={selectedPayments.includes(payment.id)}
                  onChange={(e) => onSelectPayment(payment.id, e.target.checked)}
                />
              </td>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                {payment.id.slice(0, 8)}...
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {getBeneficiaryName(payment.beneficiaryId)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatCurrency(payment.amount)}
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
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatDate(payment.date)}
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex items-center gap-2 justify-end">
                  {payment.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleDelete(payment)}
                      className="text-red-600 hover:text-red-900"
                      title={`Delete ${payment.status.toLowerCase()} payment`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onToggleExpand(expandedId === payment.id ? null : payment.id)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    {expandedId === payment.id ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
            {expandedId === payment.id && (
              <tr>
                <td colSpan={9} className="px-4 py-4 bg-gray-50">
                  <div className="space-y-2">
                    <div className="flex items-start gap-8">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Description</h4>
                        <p className="mt-1 text-sm text-gray-500">{payment.description || 'No description provided'}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Notes</h4>
                        <p className="mt-1 text-sm text-gray-500">{payment.notes || 'No notes provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Created: {formatDateTime(payment.createdAt)}
                      </div>
                      {payment.updatedAt && payment.updatedAt !== payment.createdAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Updated: {formatDateTime(payment.updatedAt)}
                        </div>
                      )}
                      {payment.deletedAt && (
                        <div className="flex items-center gap-1 text-red-500">
                          <Clock className="h-4 w-4" />
                          Deleted: {formatDateTime(payment.deletedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}