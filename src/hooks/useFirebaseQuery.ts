import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { donorServices, donationServices, feedingRoundServices, treasuryServices, beneficiaryServices } from '../services/firebase';
import { useStore } from '../store';

interface TreasuryCategory {
  id: string;
  name: string;
  balance: number;
  createdAt: any;
  updatedAt: any;
}

export const useFirebaseQuery = () => {
  const { 
    setDonors, 
    setDonations, 
    setFeedingRounds, 
    setTreasuryCategories,
    setBeneficiaries 
  } = useStore();

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

  const { 
    isLoading: isLoadingDonations,
    data: donations 
  } = useQuery({
    queryKey: ['donations'],
    queryFn: async () => {
      const data = await donationServices.getAll();
      console.log('Donations data fetched:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Setting donations in store:', data);
      setDonations(data);
    }
  });

  const { 
    isLoading: isLoadingFeedingRounds,
    data: feedingRounds 
  } = useQuery({
    queryKey: ['feedingRounds'],
    queryFn: async () => {
      const data = await feedingRoundServices.getAll();
      console.log('Feeding rounds fetched:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('Setting feeding rounds in store:', data);
      setFeedingRounds(data);
    }
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

  const { 
    isLoading: isLoadingBeneficiaries,
    data: beneficiaries = []
  } = useQuery({
    queryKey: ['beneficiaries'],
    queryFn: async () => {
      const data = await beneficiaryServices.getAll();
      return data;
    },
    onSuccess: (data) => {
      setBeneficiaries(data);
    }
  });

  React.useEffect(() => {
    if (treasuryCategories) {
      setTreasuryCategories(treasuryCategories);
    }
  }, [treasuryCategories, setTreasuryCategories]);

  return {
    isLoading: isLoadingDonors || isLoadingDonations || isLoadingFeedingRounds || 
               isLoadingTreasury || isLoadingBeneficiaries,
    donors,
    donorsError,
    treasuryCategories,
    donations,
    feedingRounds,
    beneficiaries
  };
};