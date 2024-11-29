import { format } from 'date-fns';

export const generateId = (type: 'PR' | 'DN' | 'DR' | 'BN' | 'PY', date?: Date): string => {
  const currentDate = date || new Date();
  const dateStr = format(currentDate, 'yyyyMMdd');
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  
  return `${type}-${dateStr}-${randomStr}`;
};

export const validateId = (id: string): boolean => {
  const pattern = /^(PR|DN|DR|BN|PY)-\d{8}-[A-Z0-9]{5}$/;
  return pattern.test(id);
};

export const extractDateFromId = (id: string): Date | null => {
  const match = id.match(/^[A-Z]{2}-(\d{8})-[A-Z0-9]{5}$/);
  if (!match) return null;
  
  const dateStr = match[1];
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  
  return new Date(year, month, day);
};