import { format, parseISO } from 'date-fns';
import { logger } from './logger';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const calculateMonthlyTotals = (
  items: Array<{ amount: number; date: string }>,
  startDate: Date,
  endDate: Date
): Record<string, number> => {
  try {
    const monthlyTotals: Record<string, number> = {};
    
    // Initialize all months with 0
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const monthKey = format(currentDate, 'MMM yyyy');
      monthlyTotals[monthKey] = 0;
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Sum up amounts for each month
    items.forEach(item => {
      try {
        const date = parseISO(item.date);
        const monthKey = format(date, 'MMM yyyy');
        if (monthlyTotals.hasOwnProperty(monthKey)) {
          monthlyTotals[monthKey] += item.amount;
        }
      } catch (error) {
        logger.warn('Invalid date in item', { item, error }, 'Formatters');
      }
    });

    return monthlyTotals;
  } catch (error) {
    logger.error('Error calculating monthly totals', { error }, 'Formatters');
    return {};
  }
};

export const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;

  try {
    if (value instanceof Date) return value;
    if (typeof value !== 'string') {
      logger.warn('Invalid date value type', { type: typeof value, value }, 'Formatters');
      return null;
    }

    const date = parseISO(value);
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date string', { value }, 'Formatters');
      return null;
    }

    return date;
  } catch (error) {
    logger.error('Error converting to date', { error, value }, 'Formatters');
    return null;
  }
};

export const formatDate = (value: string | Date | null | undefined): string => {
  try {
    const date = toDate(value);
    if (!date) return '';
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    logger.error('Error formatting date', { error, value }, 'Formatters');
    return '';
  }
};

export const formatDateTime = (value: string | Date | null | undefined): string => {
  try {
    const date = toDate(value);
    if (!date) return '';
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    logger.error('Error formatting datetime', { error, value }, 'Formatters');
    return '';
  }
};

export const formatMonthYear = (value: string | Date | null | undefined): string => {
  try {
    const date = toDate(value);
    if (!date) return '';
    return format(date, 'MMMM yyyy');
  } catch (error) {
    logger.error('Error formatting month/year', { error, value }, 'Formatters');
    return '';
  }
};