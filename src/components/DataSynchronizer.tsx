import React from 'react';
import { useAllData } from '../hooks/useFirebaseQuery';
import { useStore } from '../store';

/**
 * Component that synchronizes data between React Query and Zustand store
 */
export const DataSynchronizer: React.FC = () => {
  const { data } = useAllData();
  const {
    setTreasuryCategories,
    setBeneficiaries,
    setDonors,
    setDonations,
    setFeedingRounds,
    setPayments,
    setTransactions
  } = useStore();

  React.useEffect(() => {
    if (data) {
      // Update all store data when React Query data changes
      setTreasuryCategories(data.treasury || []);
      setBeneficiaries(data.beneficiaries || []);
      setDonors(data.donors || []);
      setDonations(data.donations || []);
      setFeedingRounds(data.feedingRounds || { rounds: [], lastDoc: null });
      setPayments(data.payments || []);
      setTransactions(data.transactions || []);
    }
  }, [data, setTreasuryCategories, setBeneficiaries, setDonors, setDonations, setFeedingRounds, setPayments, setTransactions]);

  return null;
}; 