import '@testing-library/jest-dom';

// Global fetch mock for tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.Mock;

// Mock @upstash/redis which requires ESM
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));
