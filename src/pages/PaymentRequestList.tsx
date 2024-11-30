import React, { useState } from 'react';
import { PaymentRequestTable } from '../components/PaymentRequestTable';
import { PaymentRequestModal } from '../components/PaymentRequestModal';
import { useStore } from '../store';
import { PaymentRequest } from '../types/paymentRequest';
import { useQueryClient } from '@tanstack/react-query';
import { paymentRequestServices } from '../services/firebase/paymentRequestService';

export default function PaymentRequestList() {
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const queryClient = useQueryClient();
  
  const { 
    paymentRequests, 
    beneficiaries, 
    treasuryCategories,
    setPaymentRequests,
    setTreasuryCategories
  } = useStore();

  const handleSelectRequest = (id: string, selected: boolean) => {
    setSelectedRequests(prev =>
      selected ? [...prev, id] : prev.filter(requestId => requestId !== id)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedRequests(selected ? paymentRequests.map(request => request.id) : []);
  };

  const handleEdit = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleDelete = async (request: PaymentRequest) => {
    if (!window.confirm('Are you sure you want to delete this payment request?')) {
      return;
    }

    try {
      // If the request was completed, add the amount back to treasury
      if (request.status === 'COMPLETED') {
        setTreasuryCategories(
          treasuryCategories.map(category =>
            category.id.toString() === request.treasuryId
              ? { ...category, balance: category.balance + request.amount }
              : category
          )
        );
      }

      // Optimistic update
      setPaymentRequests(paymentRequests.filter(pr => pr.id !== request.id));
      
      // Perform delete
      await paymentRequestServices.delete(request.id);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
    } catch (error) {
      console.error('Error deleting payment request:', error);
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['all-data'] });
      alert('Failed to delete payment request. Please try again.');
    }
  };

  const getBeneficiaryName = (id: string) => {
    const beneficiary = beneficiaries.find(b => b.id === id);
    return beneficiary ? beneficiary.name : 'Unknown';
  };

  const getCategoryName = (id: string) => {
    const category = treasuryCategories.find(c => c.id === id);
    return category ? category.name : 'Unknown';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Payment Requests
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage payment requests for beneficiaries
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => {
              setSelectedRequest(null);
              setIsModalOpen(true);
            }}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add Payment Request
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <PaymentRequestTable
              requests={paymentRequests}
              selectedRequests={selectedRequests}
              onSelectRequest={handleSelectRequest}
              onSelectAll={handleSelectAll}
              expandedId={expandedId}
              onToggleExpand={setExpandedId}
              getBeneficiaryName={getBeneficiaryName}
              getCategoryName={getCategoryName}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
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