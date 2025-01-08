import React from 'react';
import { useStore } from '../store';
import { validateTreasuryPayments } from '../utils/treasuryValidator';
import { Alert, AlertTitle } from '@mui/material';

interface TreasuryValidationProps {
  isVisible: boolean;
  validationResults: ReturnType<typeof validateTreasuryPayments> | null;
}

export const TreasuryValidation: React.FC<TreasuryValidationProps> = ({ 
  isVisible, 
  validationResults 
}) => {
  if (!isVisible || !validationResults) {
    return null;
  }

  return validationResults.isValid ? (
    <Alert severity="success" className="mb-4">
      <AlertTitle>Treasury Validation Passed</AlertTitle>
      All completed payments have been properly deducted from treasury categories.
    </Alert>
  ) : (
    <Alert severity="error" className="mb-4">
      <AlertTitle>Treasury Validation Failed</AlertTitle>
      <div className="mt-2">
        <p className="font-medium">Found {validationResults.discrepancies.length} discrepancies:</p>
        <ul className="mt-2 list-disc list-inside">
          {validationResults.discrepancies.map(discrepancy => (
            <li key={discrepancy.categoryId} className="mb-4">
              <div className="ml-4">
                <p><strong>Category:</strong> {discrepancy.categoryName}</p>
                <p><strong>Expected Balance:</strong> ${discrepancy.expectedBalance.toFixed(2)}</p>
                <p><strong>Actual Balance:</strong> ${discrepancy.actualBalance.toFixed(2)}</p>
                <p><strong>Difference:</strong> ${discrepancy.difference.toFixed(2)}</p>
                <p><strong>Completed Payments:</strong> {discrepancy.completedPayments.length}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600">View Payments</summary>
                  <ul className="mt-2 list-disc list-inside">
                    {discrepancy.completedPayments.map(payment => (
                      <li key={payment.id} className="ml-4 text-sm">
                        ID: {payment.id} - Amount: ${payment.amount.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Alert>
  );
};

export const useTreasuryValidation = () => {
  const { payments, treasuryCategories } = useStore();
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationResults, setValidationResults] = React.useState<ReturnType<typeof validateTreasuryPayments> | null>(null);

  const runValidation = React.useCallback(() => {
    setIsValidating(true);
    try {
      const results = validateTreasuryPayments(payments, treasuryCategories);
      setValidationResults(results);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [payments, treasuryCategories]);

  return {
    runValidation,
    isValidating,
    validationResults,
    setValidationResults
  };
}; 