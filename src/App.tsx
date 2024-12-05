import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import DonorList from './pages/DonorList';
import BeneficiaryList from './pages/BeneficiaryList';
import PaymentRequestList from './pages/PaymentRequestList';
import PaymentList from './pages/PaymentList';
import FeedingRoundList from './pages/FeedingRoundList';
import TreasuryList from './pages/TreasuryList';
import DonationList from './pages/DonationList';
import TreasuryCategoryList from './pages/TreasuryCategories';

const queryClient = new QueryClient();

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/payment-requests" replace />} />
        <Route path="donors" element={<DonorList />} />
        <Route path="donations" element={<DonationList />} />
        <Route path="beneficiaries" element={<BeneficiaryList />} />
        <Route path="payment-requests" element={<PaymentRequestList />} />
        <Route path="payments" element={<PaymentList />} />
        <Route path="feeding-rounds" element={<FeedingRoundList />} />
        <Route path="treasury" element={<TreasuryList />} />
        {/* <Route path="treasury-categories" element={<TreasuryCategoryList />} /> */}
        <Route path="*" element={<Navigate to="/donors" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;