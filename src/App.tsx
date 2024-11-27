import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import DonorList from './pages/DonorList';
import DonationList from './pages/DonationList';
import FeedingRoundList from './pages/FeedingRoundList';
import TreasuryList from './pages/TreasuryList';
import TreasuryCategories from './pages/TreasuryCategories';
import BeneficiaryList from './pages/BeneficiaryList';
import PaymentList from './pages/PaymentList';
import { useFirebaseQuery } from './hooks/useFirebaseQuery';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function AppContent() {
  const { isLoading } = useFirebaseQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/donors" replace />} />
        <Route path="donors" element={<DonorList />} />
        <Route path="donations" element={<DonationList />} />
        <Route path="feeding-rounds" element={<FeedingRoundList />} />
        <Route path="treasury" element={<TreasuryList />} />
        <Route path="treasury-categories" element={<TreasuryCategories />} />
        <Route path="beneficiaries" element={<BeneficiaryList />} />
        <Route path="payments" element={<PaymentList />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;