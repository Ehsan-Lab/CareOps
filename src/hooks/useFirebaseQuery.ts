import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { beneficiaryServices } from "../services/firebase/beneficiaryService";
import { donorServices } from "../services/firebase/donorService";
import { donationServices } from "../services/firebase/donationService";
import { feedingRoundServices } from "../services/firebase/feedingRoundService";
import { treasuryServices } from "../services/firebase/treasuryService";
import { paymentServices } from "../services/firebase/paymentService";
import { paymentRequestServices } from "../services/firebase/paymentRequestService";
import { 
  validateFirebaseConnection, 
  setConnectionStatus, 
  addConnectionStateListener, 
  removeConnectionStateListener 
} from '../config/firebase';
import { useStore } from '../store';

export const useFirebaseQuery = () => {
  const { 
    setBeneficiaries,
    setDonors,
    setDonations,
    setFeedingRounds,
    setTreasuryCategories,
    setPayments,
    setPaymentRequests,
    beneficiaries,
    donors,
    donations,
    feedingRounds,
    treasuryCategories,
    payments,
    paymentRequests
  } = useStore();

  // Monitor connection state
  React.useEffect(() => {
    const handleConnectionChange = (status: boolean) => {
      console.log(`Connection status changed: ${status ? 'Online' : 'Offline'}`);
    };

    addConnectionStateListener(handleConnectionChange);
    return () => removeConnectionStateListener(handleConnectionChange);
  }, []);

  // Validate Firebase connection first
  const { isLoading: isValidating } = useQuery({
    queryKey: ['firebase-connection'],
    queryFn: async () => {
      const isValid = await validateFirebaseConnection();
      setConnectionStatus(isValid);
      if (!isValid) {
        throw new Error('Firebase connection failed');
      }
      return isValid;
    },
    retry: 3,
    retryDelay: 2000,
    staleTime: 30000
  });

  // Fetch all data with proper error handling
  const { isLoading: isLoadingData, error: dataError } = useQuery({
    queryKey: ['all-data'],
    queryFn: async () => {
      try {
        const [
          beneficiariesData,
          donorsData,
          donationsData,
          feedingRoundsData,
          treasuryCategoriesData,
          paymentsData,
          paymentRequestsData
        ] = await Promise.all([
          beneficiaryServices.getAll(),
          donorServices.getAll(),
          donationServices.getAll(),
          feedingRoundServices.getAll(),
          treasuryServices.getAll(),
          paymentServices.getAll(),
          paymentRequestServices.getAll()
        ]);

        setBeneficiaries(beneficiariesData);
        setDonors(donorsData);
        setDonations(donationsData);
        setFeedingRounds(feedingRoundsData);
        setTreasuryCategories(treasuryCategoriesData);
        setPayments(paymentsData);
        setPaymentRequests(paymentRequestsData);

        return {
          beneficiaries: beneficiariesData,
          donors: donorsData,
          donations: donationsData,
          feedingRounds: feedingRoundsData,
          treasuryCategories: treasuryCategoriesData,
          payments: paymentsData,
          paymentRequests: paymentRequestsData
        };
      } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
      }
    },
    enabled: !isValidating,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  return {
    isLoading: isValidating || isLoadingData,
    error: dataError,
    beneficiaries,
    donors,
    donations,
    feedingRounds,
    treasuryCategories,
    payments,
    paymentRequests
  };
};