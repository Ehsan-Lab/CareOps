/**
 * @module App
 * @description Main application component that sets up routing, authentication, and the application structure
 */

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
import Dashboard from './pages/Dashboard';
import TransactionsList from './pages/TransactionsList';

/**
 * @constant
 * @description Query client instance for managing API cache and requests
 */
const queryClient = new QueryClient();

/**
 * @component
 * @description Internal component that handles the routing structure of the application
 * Contains all routes and their corresponding components, including protected routes
 * @returns {JSX.Element} The routing structure of the application
 */
function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="donors" element={<DonorList />} />
        <Route path="donations" element={<DonationList />} />
        <Route path="beneficiaries" element={<BeneficiaryList />} />
        <Route path="payment-requests" element={<PaymentRequestList />} />
        <Route path="payments" element={<PaymentList />} />
        <Route path="feeding-rounds" element={<FeedingRoundList />} />
        <Route path="treasury" element={<TreasuryList />} />
        <Route path="transactions" element={<TransactionsList />} />
        {/* <Route path="treasury-categories" element={<TreasuryCategoryList />} /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

/**
 * @component
 * @description Root component of the application that sets up core providers
 * Wraps the application with Router, QueryClient, and Auth providers
 * @returns {JSX.Element} The fully configured application with all necessary providers
 */
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