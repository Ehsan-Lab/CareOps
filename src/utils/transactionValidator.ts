import { validateId, extractDateFromId } from './idGenerator';

interface TransactionValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateTransaction = (
  sourceId: string,
  destinationId: string,
  amount: number,
  sourceBalance: number,
  metadata: Record<string, any>
): TransactionValidationResult => {
  const errors: string[] = [];

  // Validate IDs
  if (!validateId(sourceId)) {
    errors.push(`Invalid source ID format: ${sourceId}`);
  }
  if (!validateId(destinationId)) {
    errors.push(`Invalid destination ID format: ${destinationId}`);
  }

  // Validate amount
  if (amount <= 0) {
    errors.push('Transaction amount must be greater than 0');
  }
  if (amount > sourceBalance) {
    errors.push('Insufficient balance for transaction');
  }

  // Validate metadata
  const requiredFields = ['timestamp', 'description', 'type'];
  for (const field of requiredFields) {
    if (!metadata[field]) {
      errors.push(`Missing required metadata field: ${field}`);
    }
  }

  // Validate timestamp is not in future
  if (metadata.timestamp && new Date(metadata.timestamp) > new Date()) {
    errors.push('Transaction timestamp cannot be in the future');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePaymentRequestTransition = (
  requestId: string,
  paymentId: string,
  status: string
): TransactionValidationResult => {
  const errors: string[] = [];

  // Validate IDs
  if (!validateId(requestId) || !requestId.startsWith('PR-')) {
    errors.push('Invalid payment request ID format');
  }
  if (!validateId(paymentId) || !paymentId.startsWith('PY-')) {
    errors.push('Invalid payment ID format');
  }

  // Validate status transition
  const validStatuses = ['CREATED', 'PENDING', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    errors.push('Invalid status value');
  }

  // Validate request and payment dates
  const requestDate = extractDateFromId(requestId);
  const paymentDate = extractDateFromId(paymentId);
  
  if (requestDate && paymentDate && paymentDate < requestDate) {
    errors.push('Payment date cannot be earlier than request date');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateBalances = (
  transactions: Array<{ sourceId: string; destinationId: string; amount: number }>,
  balances: Record<string, number>
): TransactionValidationResult => {
  const errors: string[] = [];
  const runningBalances = { ...balances };

  for (const tx of transactions) {
    // Update source balance
    if (!runningBalances[tx.sourceId]) {
      errors.push(`Unknown source account: ${tx.sourceId}`);
      continue;
    }
    runningBalances[tx.sourceId] -= tx.amount;
    if (runningBalances[tx.sourceId] < 0) {
      errors.push(`Negative balance detected for account: ${tx.sourceId}`);
    }

    // Update destination balance
    if (!runningBalances[tx.destinationId]) {
      runningBalances[tx.destinationId] = 0;
    }
    runningBalances[tx.destinationId] += tx.amount;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};