import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, CreditCard } from 'lucide-react';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { PaymentRequestModal } from '../components/PaymentRequestModal';
import { PaymentRequestTable } from '../components/PaymentRequestTable';
import { PaymentFilters } from '../components/PaymentFilters';
import { paymentRequestServices } from '../services/firebase/paymentRequestService';
import { PaymentRequest, PaymentRequestStatus } from '../types/paymentRequest';
import { useQueryClient } from '@tanstack/react-query';
import { calculateMonthlyTotals, formatAmount } from '../utils/formatters';

function PaymentRequestList() {
  const { paymentRequests = [], treasuryCategories = [], beneficiaries = [] } = useFirebaseQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentRequestStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ONE_TIME' | 'SEASONAL' | 'RECURRING' | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const filteredRequests = useMemo(() => {
    return paymentRequests.filter(request => {
      const matchesStatus = statusFilter === 'ALL' || request.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || request.paymentType === typeFilter;
      const matchesSearch = searchTerm === '' || 
        getBeneficiaryName(request.beneficiaryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryName(request.treasuryId).toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [paymentRequests, statusFilter, typeFilter, searchTerm]);

  const groupedRequests = useMemo(() => {
    return filteredRequests.reduce((acc, request) => {
      const month = format(new Date(request.startDate), 'yyyy-MM');
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(request);
      return acc;
    }, {} as Record<string, PaymentRequest[]>);
  }, [filteredRequests]);

  const sortedMonths = useMemo(() => 
    Object.keys(groupedRequests).sort((a, b) => b.localeCompare(a)),
    [groupedRequests]
  );

  const monthlyTotals = useMemo(() => 
    calculateMonthlyTotals(groupedRequests),
    [groupedRequests]
  );

  const handleBulkStatusUpdate = async (status: PaymentRequestStatus) => {
    if (!selectedRequests.length) return;
    
    try {
      await paymentRequestServices.bulkUpdateStatus(selectedRequests, status);
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
      setSelectedRequests([]);
    } catch (error) {
      console.error('Error updating request statuses:', error);
      alert('Failed to update request statuses');
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

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            Payment Requests
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track payment requests with detailed monthly summaries
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-4">
          {selectedRequests.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => handleBulkStatusUpdate(e.target.value as PaymentRequestStatus)}
                className="rounded-md border-gray-300 text-sm"
              >
                <option value="">Update Status</option>
                <option value="PENDING">Mark Pending</option>
                <option value="COMPLETED">Mark Completed</option>
              </select>
              <span className="text-sm text-gray-500">
                {selectedRequests.length} selected
              </span>
            </div>
          )}
          <button
            onClick={() => {
              setSelectedRequest(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </button>
        </div>
      </div>

      <PaymentFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="space-y-6">
        {sortedMonths.map(month => {
          const monthRequests = groupedRequests[month];
          const isExpanded = selectedMonth === month;
          const total = monthlyTotals[month];
          
          return (
            <div key={month} className="bg-white rounded-lg shadow">
              <button
                onClick={() => setSelectedMonth(isExpanded ? null : month)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <h3 className="text-lg font-medium text-gray-900">
                      {format(new Date(month), 'MMMM yyyy')}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {monthRequests.length} requests · Total: ${formatAmount(total)}
                    </p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200">
                  <PaymentRequestTable
                    requests={monthRequests}
                    selectedRequests={selectedRequests}
                    onSelectRequest={(id, selected) => {
                      setSelectedRequests(prev => 
                        selected ? [...prev, id] : prev.filter(p => p !== id)
                      );
                    }}
                    onSelectAll={(selected) => {
                      const monthRequestIds = monthRequests.map(p => p.id);
                      setSelectedRequests(prev => 
                        selected 
                          ? [...new Set([...prev, ...monthRequestIds])]
                          : prev.filter(id => !monthRequestIds.includes(id))
                      );
                    }}
                    onEdit={(request) => {
                      setSelectedRequest(request);
                      setIsModalOpen(true);
                    }}
                    expandedId={expandedId}
                    onToggleExpand={setExpandedId}
                    getBeneficiaryName={getBeneficiaryName}
                    getCategoryName={getCategoryName}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PaymentRequestModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
      />
    </div>
  );
}

export default PaymentRequestList;