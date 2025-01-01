import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, CreditCard } from 'lucide-react';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { PaymentModal } from '../components/modals/PaymentModal';
import { PaymentTable } from '../components/PaymentTable';
import { PaymentFilters } from '../components/PaymentFilters';
import { paymentServices } from '../services/firebase/paymentService';
import { Payment, PaymentStatus, PaymentType } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { calculateMonthlyTotals, formatCurrency } from '../utils/formatters';
import { logger } from '../utils/logger';

function PaymentList() {
  const { payments = [], treasuryCategories = [], beneficiaries = [] } = useFirebaseQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<PaymentType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesStatus = statusFilter === 'ALL' || payment.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || payment.paymentType === typeFilter;
      const matchesSearch = searchTerm === '' || 
        getBeneficiaryName(payment.beneficiaryId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryName(payment.categoryId).toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [payments, statusFilter, typeFilter, searchTerm]);

  const groupedPayments = useMemo(() => {
    return filteredPayments.reduce((acc, payment) => {
      const month = format(new Date(payment.date), 'yyyy-MM');
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(payment);
      return acc;
    }, {} as Record<string, Payment[]>);
  }, [filteredPayments]);

  const sortedMonths = useMemo(() => 
    Object.keys(groupedPayments).sort((a, b) => b.localeCompare(a)),
    [groupedPayments]
  );

  const monthlyTotals = useMemo(() => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5); // Last 6 months
    const endDate = new Date();
    
    const paymentItems = filteredPayments.map(payment => ({
      amount: payment.amount,
      date: payment.date
    }));
    
    return calculateMonthlyTotals(paymentItems, startDate, endDate);
  }, [filteredPayments]);

  const handleBulkStatusUpdate = async (status: PaymentStatus) => {
    if (!selectedPayments.length) return;
    
    try {
      await Promise.all(
        selectedPayments.map(id => 
          paymentServices.update(id, { status })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setSelectedPayments([]);
    } catch (error) {
      logger.error('Error updating payment statuses', error, 'PaymentList');
      alert('Failed to update payment statuses');
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
            Payment Tracking
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track all payments with detailed monthly summaries
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-4">
          {selectedPayments.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => handleBulkStatusUpdate(e.target.value as PaymentStatus)}
                className="rounded-md border-gray-300 text-sm"
                aria-label="Bulk status update"
                title="Update status for selected payments"
              >
                <option value="">Update Status</option>
                <option value="COMPLETED">Mark Completed</option>
                <option value="PENDING">Mark Pending</option>
                <option value="CANCELLED">Mark Cancelled</option>
              </select>
              <span className="text-sm text-gray-500">
                {selectedPayments.length} selected
              </span>
            </div>
          )}
          <button
            onClick={() => {
              setSelectedPayment(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payment
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
          const monthPayments = groupedPayments[month];
          const isExpanded = selectedMonth === month;
          const total = monthlyTotals[format(new Date(month), 'MMM yyyy')] || 0;
          
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
                      {monthPayments.length} payments · Total: {formatCurrency(total)}
                    </p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200">
                  <PaymentTable
                    payments={monthPayments}
                    selectedPayments={selectedPayments}
                    onSelectPayment={(id, selected) => {
                      setSelectedPayments(prev => 
                        selected ? [...prev, id] : prev.filter(p => p !== id)
                      );
                    }}
                    onSelectAll={(selected) => {
                      const monthPaymentIds = monthPayments.map(p => p.id);
                      setSelectedPayments(prev => 
                        selected 
                          ? [...new Set([...prev, ...monthPaymentIds])]
                          : prev.filter(id => !monthPaymentIds.includes(id))
                      );
                    }}
                    onEdit={(payment) => {
                      setSelectedPayment(payment);
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