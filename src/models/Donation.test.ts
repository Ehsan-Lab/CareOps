import { describe, it, expect } from 'vitest';
import { Donation } from './Donation';

describe('Donation', () => {
  it('should create a donation with valid properties', () => {
    const donation = new Donation({
      id: 'test-id',
      amount: 100,
      currency: 'USD',
      donorId: 'test-donor',
      charityId: 'test-charity'
    });

    expect(donation).toBeDefined();
    expect(donation.id).toBe('test-id');
    expect(donation.amount).toBe(100);
  });

  it('should throw error if amount is negative', () => {
    expect(() => {
      new Donation({
        amount: -100,
        donorId: '123',
        campaignId: '456',
        date: new Date()
      });
    }).toThrow('Amount must be positive');
  });

  it('should throw error if required fields are missing', () => {
    expect(() => {
      new Donation({
        amount: 100,
        donorId: '',
        campaignId: '456',
        date: new Date()
      });
    }).toThrow('Donor ID is required');
  });
});
