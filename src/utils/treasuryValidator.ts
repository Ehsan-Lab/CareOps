import { Payment, TreasuryCategory } from '../types';

/**
 * Validates if all completed payments have been properly deducted from treasury categories
 * @param payments Array of payments to validate
 * @param treasuryCategories Array of treasury categories to validate against
 * @returns Object containing validation results
 */
export const validateTreasuryPayments = (
  payments: Payment[],
  treasuryCategories: TreasuryCategory[]
) => {
  const results = {
    isValid: true,
    discrepancies: [] as {
      categoryId: string;
      categoryName: string;
      expectedBalance: number;
      actualBalance: number;
      difference: number;
      completedPayments: Payment[];
    }[]
  };

  // Group completed payments by category
  const completedPaymentsByCategory = payments.reduce((acc, payment) => {
    if (payment.status === 'COMPLETED') {
      if (!acc[payment.categoryId]) {
        acc[payment.categoryId] = [];
      }
      acc[payment.categoryId].push(payment);
    }
    return acc;
  }, {} as Record<string, Payment[]>);

  // Calculate expected balances and check for discrepancies
  treasuryCategories.forEach(category => {
    const categoryPayments = completedPaymentsByCategory[category.id] || [];
    const totalPaid = categoryPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Calculate what the balance should be based on completed payments
    // Note: This assumes the initial balance was correct and only checks completed payments
    const expectedBalance = category.balance + totalPaid; // Add back the deducted payments to see if they match

    if (Math.abs(expectedBalance - category.balance) > 0.01) { // Use small epsilon for floating point comparison
      results.isValid = false;
      results.discrepancies.push({
        categoryId: category.id,
        categoryName: category.name,
        expectedBalance,
        actualBalance: category.balance,
        difference: expectedBalance - category.balance,
        completedPayments: categoryPayments
      });
    }
  });

  return results;
}; 