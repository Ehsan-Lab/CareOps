import React from 'react';
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Payment, PaymentStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
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
  onEdit: (payment: Payment) => void;
}

export function PaymentTable({
  payments,
  selectedPayments,
  onSelectPayment,
  onSelectAll,
  expandedId,
  onToggleExpand,
  getBeneficiaryName,
  getCategoryName,
  onEdit
}: PaymentTableProps) {
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = React.useState<string | null>(null);

  const handleStatusUpdate = async (payment: Payment, newStatus: PaymentStatus) => {
    try {
      setUpdatingStatus(payment.id);
      await paymentServices.updateStatus(payment.id, newStatus);
      await queryClient.invalidateQueries({ queryKey: ['all-data'] });
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status');
    } finally {
      setUpdatingStatus(null);
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

  const getStatusActions = (payment: Payment) => {
    const isUpdating = updatingStatus === payment.id;
    const baseButtonClasses = "p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed";

    switch (payment.status) {
      case 'PENDING':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusUpdate(payment, 'COMPLETED')}
              disabled={isUpdating}
              className={baseButtonClasses}
              title="Complete payment"
            >
              <CheckCircle className="w-4 h-4 text-green-600" />
            </button>
            <button
              onClick={() => handleStatusUpdate(payment, 'CANCELLED')}
              disabled={isUpdating}
              className={baseButtonClasses}
              title="Cancel payment"
            >
              <XCircle className="w-4 h-4 text-red-600" />
            </button>
          </div>
        );
      case 'COMPLETED':
        return (
          <button
            onClick={() => handleStatusUpdate(payment, 'CANCELLED')}
            disabled={isUpdating}
            className={baseButtonClasses}
            title="Cancel payment"
          >
            <XCircle className="w-4 h-4 text-red-600" />
          </button>
        );
      case 'CANCELLED':
        return null;
      default:
        return null;
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
              title="Select all payments"
              aria-label="Select all payments"
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
        {payments.map((payment) => (
          <React.Fragment key={payment.id}>
            <tr className={selectedPayments.includes(payment.id) ? 'bg-gray-50' : undefined}>
              <td className="relative px-7 sm:w-12 sm:px-6">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
                  checked={selectedPayments.includes(payment.id)}
                  onChange={(e) => onSelectPayment(payment.id, e.target.checked)}
                  title={`Select payment ${payment.id}`}
                  aria-label={`Select payment ${payment.id}`}
                />
              </td>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                {payment.id}
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
                {payment.paymentType}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                    {payment.status}
                  </span>
                  {updatingStatus === payment.id && (
                    <Clock className="w-4 h-4 animate-spin text-gray-500" />
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatDate(payment.date)}
              </td>
              <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <div className="flex gap-2 justify-end">
                  {getStatusActions(payment)}
                  <button
                    onClick={() => onEdit(payment)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
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
                <td colSpan={9} className="px-4 py-4 text-sm text-gray-500 bg-gray-50">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Beneficiary ID:</span> {payment.beneficiaryId}
                      </div>
                      <div>
                        <span className="font-medium">Treasury ID:</span> {payment.treasuryId}
                      </div>
                    </div>
                    {payment.paymentType === 'RECURRING' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Frequency:</span> {payment.frequency}
                        </div>
                        <div>
                          <span className="font-medium">Repetition:</span> {payment.repetitionNumber}/{payment.totalRepetitions}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Description:</span> {payment.description}
                    </div>
                    {payment.notes && (
                      <div>
                        <span className="font-medium">Notes:</span> {payment.notes}
                      </div>
                    )}
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