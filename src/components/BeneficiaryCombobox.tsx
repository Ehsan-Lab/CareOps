import React, { useState } from 'react';
import { Combobox } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Beneficiary } from '../types';

interface BeneficiaryComboboxProps {
  beneficiaries: Beneficiary[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function BeneficiaryCombobox({
  beneficiaries,
  value,
  onChange,
  error,
  disabled
}: BeneficiaryComboboxProps) {
  const [query, setQuery] = useState('');

  const filteredBeneficiaries = query === ''
    ? beneficiaries
    : beneficiaries.filter((beneficiary) => {
        const searchStr = `${beneficiary.name} ${beneficiary.email} ${beneficiary.phone}`.toLowerCase();
        return searchStr.includes(query.toLowerCase());
      });

  const selectedBeneficiary = beneficiaries.find(b => b.id === value);

  return (
    <Combobox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative">
        <div className="relative w-full">
          <Combobox.Input
            className={`w-full rounded-md border-gray-300 bg-white py-2 pl-3 pr-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
              error ? 'border-red-300' : ''
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            displayValue={(id: string) => {
              const beneficiary = beneficiaries.find(b => b.id === id);
              return beneficiary ? beneficiary.name : '';
            }}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search beneficiary..."
            disabled={disabled}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </Combobox.Button>
        </div>

        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredBeneficiaries.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
              No beneficiaries found.
            </div>
          ) : (
            filteredBeneficiaries.map((beneficiary) => (
              <Combobox.Option
                key={beneficiary.id}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-indigo-600 text-white' : 'text-gray-900'
                  }`
                }
                value={beneficiary.id}
              >
                {({ selected, active }) => (
                  <>
                    <div className="flex flex-col">
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {beneficiary.name}
                      </span>
                      <span className={`block truncate text-xs ${
                        active ? 'text-indigo-200' : 'text-gray-500'
                      }`}>
                        {beneficiary.supportType} • {beneficiary.phone}
                      </span>
                    </div>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? 'text-white' : 'text-indigo-600'
                        }`}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))
          )}
        </Combobox.Options>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </Combobox>
  );
}