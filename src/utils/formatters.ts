import { Timestamp } from 'firebase/firestore';

export const formatAmount = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null) return '0.00';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '0.00';
  
  return numericAmount.toFixed(2);
};

export const calculateMonthlyTotals = (
  groupedItems: Record<string, Array<{ amount: number | string | undefined }>>
): Record<string, number> => {
  return Object.entries(groupedItems).reduce((totals, [month, items]) => {
    const total = items.reduce((sum, item) => {
      if (!item.amount) return sum;
      const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    totals[month] = total;
    return totals;
  }, {} as Record<string, number>);
};

export const formatCurrency = (amount: number | string | undefined, locale = 'en-US', currency = 'USD'): string => {
  const numericAmount = ensureNumericAmount(amount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(numericAmount);
};

export const ensureNumericAmount = (amount: number | string | undefined): number => {
  if (amount === undefined || amount === null) return 0;
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(numericAmount) ? 0 : numericAmount;
};

export const calculateTotalUnits = (amount: number, unitPrice: number): number => {
  if (!unitPrice || unitPrice <= 0) return 0;
  return amount / unitPrice;
};

const isFirestoreTimestamp = (value: any): value is Timestamp => {
  return value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value;
};

const convertToDate = (value: string | Date | Timestamp | undefined | null): Date | null => {
  if (!value) return null;

  try {
    if (isFirestoreTimestamp(value)) {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', value);
        return null;
      }
      return date;
    }

    return null;
  } catch (error) {
    console.error('Error converting to date:', error);
    return null;
  }
};

export const formatDate = (value: string | Date | Timestamp | undefined | null): string => {
  const date = convertToDate(value);
  if (!date) return 'N/A';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export const formatDateTime = (value: string | Date | Timestamp | undefined | null): string => {
  const date = convertToDate(value);
  if (!date) return 'N/A';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid Date';
  }
};

export const formatMonthYear = (value: string | Date | Timestamp | undefined | null): string => {
  const date = convertToDate(value);
  if (!date) return 'N/A';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long'
    }).format(date);
  } catch (error) {
    console.error('Error formatting month/year:', error);
    return 'Invalid Date';
  }
};