/**
 * @module Dashboard
 * @description Main dashboard component displaying key statistics and visualizations
 * for the charity management system
 */

import React, { useMemo } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Alert, Grid } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useFirebaseQuery } from '../hooks/useFirebaseQuery';
import { Donation, FeedingRound, Beneficiary } from '../types';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

/**
 * @component
 * @description Main dashboard component showing key metrics and visualizations
 */
const Dashboard: React.FC = () => {
  // Fetch data using our custom Firebase hook
  const {
    isLoading,
    error,
    donors,
    donations,
    feedingRounds,
    beneficiaries,
    treasuryCategories
  } = useFirebaseQuery();

  // Calculate statistics and prepare chart data
  const stats = useMemo(() => {
    if (!donors || !donations || !feedingRounds || !beneficiaries) {
      return null;
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Active donors this month
    const activeDonorsThisMonth = new Set(
      donations
        .filter(d => isWithinInterval(new Date(d.date), { start: monthStart, end: monthEnd }))
        .map(d => d.donorId)
    ).size;

    // Total donations this month
    const donationsThisMonth = donations
      .filter(d => isWithinInterval(new Date(d.date), { start: monthStart, end: monthEnd }))
      .reduce((sum, d) => sum + d.amount, 0);

    // Active beneficiaries
    const activeBeneficiaries = beneficiaries.filter(b => b.status === 'ACTIVE').length;

    // Completed feeding rounds this month
    const completedFeedingRounds = feedingRounds.filter(
      fr => fr.status === 'COMPLETED' && 
      isWithinInterval(new Date(fr.date), { start: monthStart, end: monthEnd })
    ).length;

    return {
      totalDonors: donors.length,
      activeDonorsThisMonth,
      totalBeneficiaries: beneficiaries.length,
      activeBeneficiaries,
      totalDonations: donations.reduce((sum, d) => sum + d.amount, 0),
      donationsThisMonth,
      completedFeedingRounds,
      upcomingFeedingRounds: feedingRounds.filter(fr => fr.status === 'PENDING').length
    };
  }, [donors, donations, feedingRounds, beneficiaries]);

  // Prepare monthly donations chart data
  const monthlyDonationsData = useMemo(() => {
    if (!donations) return [];

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: format(date, 'MMM yyyy'),
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    }).reverse();

    return last6Months.map(({ month, start, end }) => ({
      month,
      amount: donations
        .filter(d => isWithinInterval(new Date(d.date), { start, end }))
        .reduce((sum, d) => sum + d.amount, 0)
    }));
  }, [donations]);

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
                Total Beneficiaries
              </Typography>
              <Typography variant="h5">
                {stats.totalBeneficiaries}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.activeBeneficiaries} currently active
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
        {/* Monthly Donations Trend */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Donations Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyDonationsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#8884d8" 
                    name="Donation Amount"
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