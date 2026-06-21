import '@testing-library/jest-dom';

// Mock @upstash/redis which requires ESM
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));
