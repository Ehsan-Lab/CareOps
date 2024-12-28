import { useQuery } from "@tanstack/react-query";
import { beneficiaryServices } from "../services/firebase/beneficiaryService";
import { donationServices } from "../services/firebase/donationService";
import { donorServices } from "../services/firebase/donorService";
import { feedingRoundServices } from "../services/firebase/feedingRoundService";
import { paymentServices } from "../services/firebase/paymentService";
import { treasuryServices } from "../services/firebase/treasuryService";
import { transactionServices } from "../services/firebase/transactionService";

/**
 * @deprecated Use useAllData or useDashboardData instead
 * Legacy hook for backward compatibility
 */
export const useFirebaseQuery = () => {
  const { data, isLoading, error } = useAllData();
  console.log('useFirebaseQuery: Raw data:', data);
  
  const result = {
    isLoading,
    error,
    donors: data?.donors || [],
    beneficiaries: data?.beneficiaries || [],
    donations: data?.donations || [],
    payments: data?.payments || [],
    feedingRounds: {
      rounds: data?.feedingRounds?.rounds || [],
      lastDoc: data?.feedingRounds?.lastDoc || null
    },
    treasuryCategories: data?.treasury || [],
    transactions: data?.transactions || [],
  };

  console.log('useFirebaseQuery: Returning result:', result);
  return result;
};

/**
 * Custom hook to fetch all data from Firebase
 * @returns Object containing all data and loading states
 */
export function useAllData() {
  return useQuery({
    queryKey: ["all-data"],
    queryFn: async () => {
      console.log('useAllData: Starting data fetch...');
      const [
        donors,
        beneficiaries,
        donations,
        payments,
        feedingRoundsResult,
        treasury,
        transactions
      ] = await Promise.all([
        donorServices.getAll(),
        beneficiaryServices.getAll(),
        donationServices.getAll(),
        paymentServices.getAll(),
        feedingRoundServices.getAll(),
        treasuryServices.getAll(),
        transactionServices.getAll()
      ]);

      console.log('useAllData: Feeding rounds result:', feedingRoundsResult);

      const result = {
        donors,
        beneficiaries,
        donations,
        payments,
        feedingRounds: {
          rounds: feedingRoundsResult.rounds || [],
          lastDoc: feedingRoundsResult.lastDoc || null
        },
        treasury,
        transactions
      };

      console.log('useAllData: Returning data:', result);
      return result;
    }
  });
}

/**
 * Custom hook to fetch all data for the dashboard
 * @returns Object containing dashboard data and loading state
 */
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const [
        donors,
        beneficiaries,
        donations,
        payments,
        feedingRounds,
        treasury,
        transactions
      ] = await Promise.all([
        donorServices.getAll(),
        beneficiaryServices.getAll(),
        donationServices.getAll(),
        paymentServices.getAll(),
        feedingRoundServices.getAll(),
        treasuryServices.getAll(),
        transactionServices.getAll()
      ]);

      return {
        donors,
        beneficiaries,
        donations,
        payments,
        feedingRounds,
        treasury,
        transactions
      };
    }
  });
}