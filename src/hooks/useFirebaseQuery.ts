import { useQuery } from '@tanstack/react-query';
import { donorServices, donationServices, feedingRoundServices, treasuryServices } from '../services/firebase';
import { useStore } from '../store';

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
      console.log('Donors fetched:', data); // Debug log
      setDonors(data);
    },
    onError: (error) => {
      console.error('Error fetching donors:', error);
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

  const { isLoading: isLoadingTreasury } = useQuery({
    queryKey: ['treasury'],
    queryFn: treasuryServices.getAll,
    onSuccess: setTreasuryCategories
  });

  return {
    isLoading: isLoadingDonors || isLoadingDonations || isLoadingFeedingRounds || isLoadingTreasury,
    donors,
    donorsError
  };
};