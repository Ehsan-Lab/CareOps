import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { donorServices, donationServices, feedingRoundServices, treasuryServices } from '../services/firebase';
import { useStore } from '../store';

interface TreasuryCategory {
  id: string;
  name: string;
  balance: number;
  createdAt: any;
  updatedAt: any;
}

export const useFirebaseQuery = () => {
  const { setDonors, setDonations, setFeedingRounds, setTreasuryCategories } = useStore();

  const { 
    isLoading: isLoadingDonors,
    data: donors,
    error: donorsError 
  } = useQuery({
    queryKey: ['donors'],
    queryFn: donorServices.getAll,
    onSuccess: (data) => {
      console.log('Donors fetched:', data);
      setDonors(data);
    }
  });

  const { isLoading: isLoadingDonations } = useQuery({
    queryKey: ['donations'],
    queryFn: donationServices.getAll,
    onSuccess: setDonations
  });

  const { isLoading: isLoadingFeedingRounds } = useQuery({
    queryKey: ['feedingRounds'],
    queryFn: feedingRoundServices.getAll,
    onSuccess: setFeedingRounds
  });

  const { 
    isLoading: isLoadingTreasury,
    data: treasuryCategories 
  } = useQuery<TreasuryCategory[]>({
    queryKey: ['treasury'],
    queryFn: async () => {
      const data = await treasuryServices.getAll();
      console.log('Treasury data fetched:', data);
      return data as TreasuryCategory[];
    }
  });

  React.useEffect(() => {
    if (treasuryCategories) {
      setTreasuryCategories(treasuryCategories);
    }
  }, [treasuryCategories, setTreasuryCategories]);

  return {
    isLoading: isLoadingDonors || isLoadingDonations || isLoadingFeedingRounds || isLoadingTreasury,
    donors,
    donorsError,
    treasuryCategories
  };
};