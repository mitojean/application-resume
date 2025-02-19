import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/serveur'],
  testMatch: [
    '**/serveur/__tests__/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'serveur/**/*.ts',
    '!serveur/**/*.d.ts',
    '!serveur/**/__tests__/**'
  ],
  verbose: true,
  setupFiles: ['<rootDir>/serveur/__tests__/setup.ts']
};

export default config;
