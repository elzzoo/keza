/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/__mocks__/server-only.ts",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/.worktrees/"],
  modulePathIgnorePatterns: ["/.worktrees/"],
  watchPathIgnorePatterns: ["/.worktrees/"],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "app/api/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "!**/*.test.{ts,tsx}",
    "!**/node_modules/**",
    "!**/.worktrees/**",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.jest.json" }],
  },
  projects: [
    {
      displayName: "node",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/__tests__/**/*.test.ts"],
      testPathIgnorePatterns: ["/node_modules/", "/.worktrees/", "__tests__/components/"],
      modulePathIgnorePatterns: ["/.worktrees/"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.jest.json" }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
        "^server-only$": "<rootDir>/__mocks__/server-only.ts",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.server.ts"],
    },
    {
      displayName: "jsdom",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      testMatch: ["**/__tests__/components/**/*.test.tsx"],
      testPathIgnorePatterns: ["/node_modules/", "/.worktrees/"],
      modulePathIgnorePatterns: ["/.worktrees/"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.jest.json" }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
        "^server-only$": "<rootDir>/__mocks__/server-only.ts",
        "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.ts",
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.components.ts"],
    },
  ],
};

module.exports = config;
