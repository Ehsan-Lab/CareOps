import React from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Payment, PaymentStatus, PaymentType } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

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
            <span className="sr-only">Details</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {payments.map((payment) => (
          <React.Fragment key={payment.id}>
            <tr className={expandedId === payment.id ? 'bg-gray-50' : undefined}>
              <td className="relative px-7 sm:w-12 sm:px-6">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
                  checked={selectedPayments.includes(payment.id)}
                  onChange={(e) => onSelectPayment(payment.id, e.target.checked)}
                />
              </td>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                {payment.id}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {getBeneficiaryName(payment.beneficiaryId)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
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
              </td>
            </tr>
            {expandedId === payment.id && (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-sm text-gray-500 bg-gray-50">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Beneficiary ID:</span> {payment.beneficiaryId}
                      </div>
                      <div>
                        <span className="font-medium">Treasury ID:</span> {payment.categoryId}
                      </div>
                    </div>
                    {payment.notes && (
                      <div>
                        <span className="font-medium">Notes:</span> {payment.notes}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="h-4 w-4" />
                      Created: {formatDateTime(payment.createdAt)}
                      {payment.updatedAt && ` • Updated: ${formatDateTime(payment.updatedAt)}`}
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