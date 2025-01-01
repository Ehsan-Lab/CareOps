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
import { DocumentSnapshot } from 'firebase/firestore';
import { logger } from '../utils/logger';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface PaginatedFeedingRounds {
  rounds: FeedingRound[];
  lastDoc: DocumentSnapshot | null;
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
}

interface Beneficiary {
  id: string;
  name: string;
  status: string;
  supportType: string;
  phone: string;
  address: string;
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

/**
 * @component
 * @description Main dashboard component showing key metrics and visualizations
 */
const Dashboard: React.FC = () => {
  // Fetch data using our custom Firebase hook
  const { data, isLoading, error } = useAllData();
  const {
    donors = [] as Donor[],
    donations = [] as Donation[],
    feedingRounds = { rounds: [], lastDoc: null } as PaginatedFeedingRounds,
    beneficiaries = [] as Beneficiary[]
  } = data || {};

  const validDonations = useMemo(() => {
    return donations?.filter(d => {
      if (!d.createdAt) {
        logger.warn('Invalid date in donation', { donationId: d.id }, 'Dashboard');
        return false;
      }
      return true;
    }) || [];
  }, [donations]);

  const validTransactions = useMemo(() => {
    return transactions?.filter(t => {
      if (!t.createdAt) {
        logger.warn('Invalid date in transaction', { transactionId: t.id }, 'Dashboard');
        return false;
      }
      return true;
    }) || [];
  }, [transactions]);

  // Calculate statistics and prepare chart data
  const stats = useMemo(() => {
    if (!donors || !donations || !feedingRounds?.rounds || !beneficiaries || !data?.transactions) {
      return null;
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Active donors this month
    const validDonations = donations.filter(isDonation);
    const validTransactions = data.transactions.transactions || [];
    
    const activeDonorsThisMonth = new Set(
      validDonations
        .filter(d => {
          try {
            return isWithinInterval(new Date(d.date), { start: monthStart, end: monthEnd });
          } catch {
            console.warn('Invalid date in donation:', d);
            return false;
          }
        })
        .map(d => d.donorId)
    ).size;

    // Total donations this month
    const donationsThisMonth = validDonations
      .filter(d => {
        try {
          return isWithinInterval(new Date(d.date), { start: monthStart, end: monthEnd });
        } catch {
          console.warn('Invalid date in donation:', d);
          return false;
        }
      })
      .reduce((sum, d) => sum + d.amount, 0);

    // Total expenses this month
    const expensesThisMonth = validTransactions
      .filter(t => {
        try {
          const transactionDate = t.createdAt?.toDate();
          return transactionDate && 
            isWithinInterval(transactionDate, { start: monthStart, end: monthEnd }) && 
            t.type === 'DEBIT';
        } catch {
          console.warn('Invalid date in transaction:', t);
          return false;
        }
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Total expenses all time
    const totalExpenses = validTransactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0);

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
      totalDonations: validDonations.reduce((sum, d) => sum + d.amount, 0),
      donationsThisMonth,
      totalExpenses,
      expensesThisMonth,
      completedFeedingRounds,
      upcomingFeedingRounds
    };
  }, [donors, donations, feedingRounds?.rounds, beneficiaries, data?.transactions]);

  // Prepare monthly donations chart data
  const monthlyDonationsData = useMemo(() => {
    if (!donations || !data?.transactions) return [];

    const validDonations = donations.filter(isDonation);
    const validTransactions = data.transactions.transactions || [];
    
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
        .filter(d => {
          try {
            return isWithinInterval(new Date(d.date), { start, end });
          } catch {
            console.warn('Invalid date in donation:', d);
            return false;
          }
        })
        .reduce((sum, d) => sum + d.amount, 0);

      // Calculate total expenses for this month
      const monthlyExpenses = validTransactions
        .filter(t => {
          try {
            const transactionDate = t.createdAt?.toDate();
            return transactionDate && 
              isWithinInterval(transactionDate, { start, end }) && 
              t.type === 'DEBIT';
          } catch {
            console.warn('Invalid date in transaction:', t);
            return false;
          }
        })
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month,
        donations: monthlyDonations,
        expenses: monthlyExpenses,
        balance: monthlyDonations - monthlyExpenses
      };
    });
  }, [donations, data?.transactions]);

  // Prepare beneficiary categories chart data
  const beneficiaryCategories = useMemo(() => {
    if (!beneficiaries) return [];

    const categories = beneficiaries.reduce((acc, b) => {
      acc[b.supportType] = (acc[b.supportType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value
    }));
  }, [beneficiaries]);

  // Prepare monthly donations and expenses chart data
  const monthlyFinancialData = useMemo(() => {
    if (!donations || !data?.transactions || !data?.treasury) return [];

    const validDonations = donations.filter(isDonation);
    const validTransactions = data.transactions.transactions || [];
    
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: format(date, 'MMM yyyy'),
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    }).reverse();

    // Initialize data structure for categories
    const categoryData = data.treasury.reduce((acc, category) => {
      acc[category.id] = {
        name: category.name,
        color: category.color || COLORS[Math.floor(Math.random() * COLORS.length)]
      };
      return acc;
    }, {} as Record<string, { name: string; color: string }>);

    return last6Months.map(({ month, start, end }) => {
      // Get donations for this month
      const monthDonations = validDonations
        .filter(d => {
          const donationDate = new Date(d.date);
          return isWithinInterval(donationDate, { start, end });
        })
        .reduce((acc, d) => {
          if (d.categoryId) {
            acc[d.categoryId] = (acc[d.categoryId] || 0) + d.amount;
          }
          return acc;
        }, {} as Record<string, number>);

      // Get expenses for this month
      const monthExpenses = validTransactions
        .filter(t => {
          const transactionDate = t.createdAt.toDate();
          return isWithinInterval(transactionDate, { start, end }) && t.type === 'DEBIT';
        })
        .reduce((acc, t) => {
          if (t.category) {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
          }
          return acc;
        }, {} as Record<string, number>);

      // Combine data for all categories
      const result: any = { month };
      Object.keys(categoryData).forEach(categoryId => {
        const categoryName = categoryData[categoryId].name;
        result[`${categoryName} Donations`] = monthDonations[categoryId] || 0;
        result[`${categoryName} Expenses`] = monthExpenses[categoryId] || 0;
      });

      return result;
    });
  }, [donations, data?.transactions, data?.treasury]);

  // Extract line colors and data keys for the chart
  const lineChartConfig = useMemo(() => {
    if (!data?.treasury) return { lines: [], colors: [] };

    return data.treasury.reduce((acc, category) => {
      const color = category.color || COLORS[Math.floor(Math.random() * COLORS.length)];
      acc.lines.push(
        `${category.name} Donations`,
        `${category.name} Expenses`
      );
      acc.colors.push(
        color,
        `${color}88` // Add transparency for expenses
      );
      return acc;
    }, { lines: [] as string[], colors: [] as string[] });
  }, [data?.treasury]);

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

      {/* Enhanced Financial Chart */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Financial Overview
              </Typography>
              <Box sx={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <LineChart data={monthlyFinancialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {lineChartConfig.lines.map((line, index) => (
                      <Line
                        key={line}
                        type="monotone"
                        dataKey={line}
                        stroke={lineChartConfig.colors[index]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
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
              <ResponsiveContainer width="100%" height={300}>
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
              <ResponsiveContainer width="100%" height={300}>
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 