module.exports = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: require('path').join(__dirname, 'coverage'),
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: { global: { branches: 0, functions: 0, lines: 0, statements: 0 } },
  resetMocks: true,
  restoreMocks: true,
  rootDir: './src',
  testEnvironment: 'jsdom',
  preset: 'ts-jest'
};
