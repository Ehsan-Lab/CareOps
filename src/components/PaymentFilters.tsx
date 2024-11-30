import React from 'react';
import { Filter, Search } from 'lucide-react';
import { PaymentStatus, PaymentType } from '../types';

interface PaymentFiltersProps {
  statusFilter: PaymentStatus | 'ALL';
  onStatusFilterChange: (status: PaymentStatus | 'ALL') => void;
  typeFilter: PaymentType | 'ALL';
  onTypeFilterChange: (type: PaymentType | 'ALL') => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function PaymentFilters({
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  searchTerm,
  onSearchChange
}: PaymentFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as PaymentStatus | 'ALL')}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as PaymentType | 'ALL')}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="ALL">All Types</option>
          <option value="ONE_TIME">One Time</option>
          <option value="RECURRING">Recurring</option>
          <option value="SEASONAL">Seasonal</option>
        </select>
      </div>

      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-md border-gray-300 pl-10 text-sm"
          />
        </div>
      </div>
    </div>
  );
}