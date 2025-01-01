/**
 * @module Dashboard
 * @description Main dashboard component displaying key statistics and visualizations
 * for the charity management system
 */

import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Alert, Grid } from '@mui/material';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useAllData } from '../hooks/useFirebaseQuery';
import { FeedingRound } from '../types';
import { DocumentSnapshot, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { logger } from '../utils/logger';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface PaginatedFeedingRounds {
  rounds: FeedingRound[];
  lastDoc: DocumentSnapshot | null;
}

interface PaginatedDonations {
  donations: Donation[];
  lastDoc: QueryDocumentSnapshot<DocumentData, DocumentData>;
}

interface Donor {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}

interface Donation {
  id: string;
  date: string;
  amount: number;
  donorId: string;
  status: string;
  description: string;
  categoryId?: string;
}

interface Beneficiary {
  id: string;
  name: string;
  status: string;
  supportType: string;
  phone: string;
  address: string;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  beneficiaryId: string;
  categoryId: string;
  description?: string;
}

interface DashboardData {
  donors: Donor[];
  donations: Donation[] | PaginatedDonations;
  feedingRounds: PaginatedFeedingRounds;
  beneficiaries: Beneficiary[];
  payments: Payment[];
}

// Type guard for Donation
const isDonation = (d: unknown): d is Donation => {
  return d !== null && typeof d === 'object' && 
    'date' in d && typeof (d as Donation).date === 'string' && 
    'amount' in d && typeof (d as Donation).amount === 'number' && 
    'donorId' in d && typeof (d as Donation).donorId === 'string';
};

// Type guard for Beneficiary
const isBeneficiary = (b: unknown): b is Beneficiary => {
  return b !== null && typeof b === 'object' && 
    'status' in b && typeof (b as Beneficiary).status === 'string';
};

// Type guard for FeedingRound
const isFeedingRound = (fr: unknown): fr is FeedingRound => {
  return fr !== null && typeof fr === 'object' && 
    'status' in fr && typeof (fr as FeedingRound).status === 'string' && 
    ['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes((fr as FeedingRound).status);
};

const Dashboard: React.FC = () => {
  const { data, isLoading, error } = useAllData();
  const {
    donors = [] as Donor[],
    donations = [] as Donation[],
    feedingRounds = { rounds: [], lastDoc: null } as PaginatedFeedingRounds,
    beneficiaries = [] as Beneficiary[],
    payments = [] as Payment[]
  } = (data || {}) as DashboardData;

  const validDonations = useMemo(() => {
    // Handle both array and paginated structure
    const donationArray = Array.isArray(donations) 
      ? donations 
      : (donations as PaginatedDonations)?.donations || [];

    return donationArray.filter((d: Donation) => {
      if (!d || !d.amount || !d.date) {
        logger.warn('Invalid donation data', { donation: d }, 'Dashboard');
        return false;
      }
      return true;
    });
  }, [donations]);

  // Calculate statistics and prepare chart data
  const stats = useMemo(() => {
    if (!donors || !validDonations || !feedingRounds?.rounds || !beneficiaries) {
      return null;
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Active donors this month
    const activeDonorsThisMonth = new Set(
      validDonations
        .filter((d: Donation) => {
          try {
            const donationDate = new Date(d.date);
            return isWithinInterval(donationDate, { start: monthStart, end: monthEnd });
          } catch (error) {
            logger.warn('Invalid date in donation', { donation: d, error }, 'Dashboard');
            return false;
          }
        })
        .map((d: Donation) => d.donorId)
    ).size;

    // Total donations this month
    const donationsThisMonth = validDonations
      .filter((d: Donation) => {
        try {
          const donationDate = new Date(d.date);
          return isWithinInterval(donationDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          logger.warn('Invalid date in donation', { donation: d, error }, 'Dashboard');
          return false;
        }
      })
      .reduce((sum: number, d: Donation) => sum + (d.amount || 0), 0);

    // Total donations all time
    const totalDonations = validDonations
      .reduce((sum: number, d: Donation) => sum + (d.amount || 0), 0);

    // Calculate expenses from payments instead of transactions
    const validPayments = payments.filter((p: Payment) => p.status === 'COMPLETED');
    
    // Total expenses this month
    const expensesThisMonth = validPayments
      .filter((p: Payment) => {
        try {
          const paymentDate = new Date(p.date);
          return isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
        } catch (error) {
          logger.warn('Invalid date in payment', { payment: p, error }, 'Dashboard');
          return false;
        }
      })
      .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);

    // Total expenses all time
    const totalExpenses = validPayments
      .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);

    // Active beneficiaries
    const validBeneficiaries = beneficiaries.filter(isBeneficiary);
    const activeBeneficiaries = validBeneficiaries
      .filter(b => b.status === 'ACTIVE')
      .length;

    // Validate and count feeding rounds
    const validFeedingRounds = feedingRounds.rounds.filter(isFeedingRound);

    // Completed feeding rounds
    const completedFeedingRounds = validFeedingRounds
      .filter(fr => fr.status === 'COMPLETED')
      .length;

    // Upcoming feeding rounds (both PENDING and IN_PROGRESS)
    const upcomingFeedingRounds = validFeedingRounds
      .filter(fr => fr.status === 'PENDING' || fr.status === 'IN_PROGRESS')
      .length;

    return {
      totalDonors: donors.length,
      activeDonorsThisMonth,
      totalBeneficiaries: beneficiaries.length,
      activeBeneficiaries,
      totalDonations,
      donationsThisMonth,
      totalExpenses,
      expensesThisMonth,
      completedFeedingRounds,
      upcomingFeedingRounds
    };
  }, [donors, validDonations, feedingRounds?.rounds, beneficiaries, payments]);

  // Prepare monthly donations chart data
  const monthlyDonationsData = useMemo(() => {
    if (!donations || !payments) return [];

    const donationArray = Array.isArray(donations) ? donations : [];
    const validDonations = donationArray.filter(isDonation);
    const validPayments = payments.filter((p: Payment) => p.status === 'COMPLETED');
    
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: format(date, 'MMM yyyy'),
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    }).reverse();

    return last6Months.map(({ month, start, end }) => {
      // Calculate total donations for this month
      const monthlyDonations = validDonations
        .filter((d: Donation) => {
          try {
            return isWithinInterval(new Date(d.date), { start, end });
          } catch (error) {
            logger.warn('Invalid date in donation', { donation: d, error }, 'Dashboard');
            return false;
          }
        })
        .reduce((sum: number, d: Donation) => sum + (d.amount || 0), 0);

      // Calculate total expenses for this month from payments
      const monthlyExpenses = validPayments
        .filter((p) => {
          try {
            const paymentDate = new Date(p.date);
            return isWithinInterval(paymentDate, { start, end });
          } catch (error) {
            logger.warn('Invalid date in payment', { payment: p, error }, 'Dashboard');
            return false;
          }
        })
        .reduce((sum: number, p) => sum + (p.amount || 0), 0);

      return {
        month,
        donations: monthlyDonations,
        expenses: monthlyExpenses,
        balance: monthlyDonations - monthlyExpenses
      };
    });
  }, [donations, data?.payments]);

  // Prepare beneficiary categories chart data
  const beneficiaryCategories = useMemo(() => {
    if (!beneficiaries) return [];

    const categories = beneficiaries.reduce((acc: Record<string, number>, b: Beneficiary) => {
      acc[b.supportType] = (acc[b.supportType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value
    }));
  }, [beneficiaries]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading dashboard data. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Donors
              </Typography>
              <Typography variant="h5">
                {stats.totalDonors}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.activeDonorsThisMonth} active this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Donations
              </Typography>
              <Typography variant="h5">
                ${stats.totalDonations.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ${stats.donationsThisMonth.toLocaleString()} this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Expenses
              </Typography>
              <Typography variant="h5" sx={{ color: 'error.main' }}>
                ${stats.totalExpenses.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ${stats.expensesThisMonth.toLocaleString()} this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Net Balance
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: stats.totalDonations - stats.totalExpenses >= 0 
                    ? 'success.main' 
                    : 'error.main' 
                }}
              >
                ${(stats.totalDonations - stats.totalExpenses).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ${(stats.donationsThisMonth - stats.expensesThisMonth).toLocaleString()} this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Feeding Rounds
              </Typography>
              <Typography variant="h5">
                {stats.completedFeedingRounds}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.upcomingFeedingRounds} upcoming
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Monthly Financial Trends */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Financial Trends
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={monthlyDonationsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="donations" 
                      stroke="#4CAF50"
                      strokeWidth={2}
                      name="Donations"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#f44336"
                      strokeWidth={2}
                      name="Expenses"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#2196F3"
                      strokeWidth={2}
                      name="Net Balance"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Beneficiary Categories */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Beneficiary Categories
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={beneficiaryCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {beneficiaryCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 