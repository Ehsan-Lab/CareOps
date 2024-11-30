import React from 'react';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { PaymentRequest, PaymentRequestStatus } from '../types/paymentRequest';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

interface PaymentRequestTableProps {
  requests: PaymentRequest[];
  selectedRequests: string[];
  onSelectRequest: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  getBeneficiaryName: (id: string) => string;
  getCategoryName: (id: string) => string;
}

export function PaymentRequestTable({
  requests,
  selectedRequests,
  onSelectRequest,
  onSelectAll,
  expandedId,
  onToggleExpand,
  getBeneficiaryName,
  getCategoryName
}: PaymentRequestTableProps) {
  const getStatusColor = (status: PaymentRequestStatus) => {
    switch (status) {
      case 'CREATED': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
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
              checked={selectedRequests.length === requests.length}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
          </th>
          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
            Request ID
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
            Start Date
          </th>
          <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
            <span className="sr-only">Details</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white">
        {requests.map((request) => (
          <React.Fragment key={request.id}>
            <tr className={expandedId === request.id ? 'bg-gray-50' : undefined}>
              <td className="relative px-7 sm:w-12 sm:px-6">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300"
                  checked={selectedRequests.includes(request.id)}
                  onChange={(e) => onSelectRequest(request.id, e.target.checked)}
                />
              </td>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                {request.id}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {getBeneficiaryName(request.beneficiaryId)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                {formatCurrency(request.amount)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {getCategoryName(request.treasuryId)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  request.paymentType === 'ONE_TIME' ? 'bg-blue-100 text-blue-800' :
                  request.paymentType === 'RECURRING' ? 'bg-purple-100 text-purple-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {request.paymentType}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {formatDate(request.startDate)}
              </td>
              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                <button
                  onClick={() => onToggleExpand(expandedId === request.id ? null : request.id)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  {expandedId === request.id ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </td>
            </tr>
            {expandedId === request.id && (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-sm text-gray-500 bg-gray-50">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Beneficiary ID:</span> {request.beneficiaryId}
                      </div>
                      <div>
                        <span className="font-medium">Treasury ID:</span> {request.treasuryId}
                      </div>
                    </div>
                    {request.paymentType !== 'ONE_TIME' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Frequency:</span> {request.frequency}
                        </div>
                        {request.endDate && (
                          <div>
                            <span className="font-medium">End Date:</span> {formatDate(request.endDate)}
                          </div>
                        )}
                      </div>
                    )}
                    {request.description && (
                      <div>
                        <span className="font-medium">Description:</span> {request.description}
                      </div>
                    )}
                    {request.notes && (
                      <div>
                        <span className="font-medium">Notes:</span> {request.notes}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="h-4 w-4" />
                      Created: {formatDateTime(request.createdAt)}
                      {request.updatedAt && ` • Updated: ${formatDateTime(request.updatedAt)}`}
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