import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@nabta/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@nabta/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@nabta/validation$': '<rootDir>/../../packages/validation/src/index.ts',
    '^@nabta/config$': '<rootDir>/../../packages/config/src/index.ts',
  },
};

export default config;
