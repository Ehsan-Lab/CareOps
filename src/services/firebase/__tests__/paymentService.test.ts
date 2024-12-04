import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentServices } from '../paymentService';
import { db } from '../../../config/firebase';
import { Payment } from '../../../types';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('../../../config/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
    runTransaction: vi.fn()
  }
}));

describe('paymentServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('delete', () => {
    it('should soft delete a pending payment', async () => {
      const mockPayment: Payment = {
        id: 'test-payment',
        beneficiaryId: 'test-beneficiary',
        categoryId: 'test-category',
        amount: 100,
        date: '2023-01-01',
        paymentType: 'ONE_TIME',
        status: 'PENDING',
        representativeId: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockPayment
        }),
        update: vi.fn()
      };

      (db.runTransaction as any).mockImplementation((callback) => callback(mockTransaction));

      await paymentServices.delete('test-payment', 'test-user');

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isDeleted: true,
          deletedBy: 'test-user',
          status: 'CANCELLED'
        })
      );
    });

    it('should throw error when trying to delete non-existent payment', async () => {
      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => false
        })
      };

      (db.runTransaction as any).mockImplementation((callback) => callback(mockTransaction));

      await expect(paymentServices.delete('non-existent', 'test-user'))
        .rejects
        .toThrow('Payment not found');
    });

    it('should throw error when trying to delete already deleted payment', async () => {
      const mockPayment: Payment = {
        id: 'test-payment',
        beneficiaryId: 'test-beneficiary',
        categoryId: 'test-category',
        amount: 100,
        date: '2023-01-01',
        paymentType: 'ONE_TIME',
        status: 'PENDING',
        representativeId: 'test-user',
        isDeleted: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockPayment
        })
      };

      (db.runTransaction as any).mockImplementation((callback) => callback(mockTransaction));

      await expect(paymentServices.delete('test-payment', 'test-user'))
        .rejects
        .toThrow('Payment already deleted');
    });

    it('should throw error when trying to delete non-pending payment', async () => {
      const mockPayment: Payment = {
        id: 'test-payment',
        beneficiaryId: 'test-beneficiary',
        categoryId: 'test-category',
        amount: 100,
        date: '2023-01-01',
        paymentType: 'ONE_TIME',
        status: 'COMPLETED',
        representativeId: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockPayment
        })
      };

      (db.runTransaction as any).mockImplementation((callback) => callback(mockTransaction));

      await expect(paymentServices.delete('test-payment', 'test-user'))
        .rejects
        .toThrow('Only pending payments can be deleted');
    });

    it('should refund treasury when deleting a completed payment', async () => {
      const mockPayment: Payment = {
        id: 'test-payment',
        beneficiaryId: 'test-beneficiary',
        categoryId: 'test-category',
        amount: 100,
        date: '2023-01-01',
        paymentType: 'ONE_TIME',
        status: 'COMPLETED',
        representativeId: 'test-user',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const mockTreasury = {
        balance: 500
      };

      const mockTransaction = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => mockPayment
          })
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => mockTreasury
          }),
        update: vi.fn()
      };

      (db.runTransaction as any).mockImplementation((callback) => callback(mockTransaction));

      await paymentServices.delete('test-payment', 'test-user');

      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          balance: 600,
          updatedAt: expect.any(Timestamp)
        })
      );
    });
  });
}); 