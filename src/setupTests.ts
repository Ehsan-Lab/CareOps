// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock the import.meta.env variables used in Firebase config
declare global {
  namespace NodeJS {
    interface Global {
      import: {
        meta: {
          env: {
            VITE_FIREBASE_API_KEY: string;
            VITE_FIREBASE_AUTH_DOMAIN: string;
            VITE_FIREBASE_PROJECT_ID: string;
            VITE_FIREBASE_STORAGE_BUCKET: string;
            VITE_FIREBASE_MESSAGING_SENDER_ID: string;
            VITE_FIREBASE_APP_ID: string;
          };
        };
      };
    }
  }
}

(global as any).import = {
  meta: {
    env: {
      VITE_FIREBASE_API_KEY: 'test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
      VITE_FIREBASE_PROJECT_ID: 'test-project-id',
      VITE_FIREBASE_STORAGE_BUCKET: 'test-storage-bucket',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-messaging-sender-id',
      VITE_FIREBASE_APP_ID: 'test-app-id',
    },
  },
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}); 