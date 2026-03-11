/** Quarantine config: runs only *.flaky.test.* with retries. Use: jest --config jest.flaky.config.js */
const base = require("./jest.config.js");

module.exports = {
  ...base,
  displayName: "quarantine",
  testMatch: [
    "**/__tests__/**/*.unit.flaky.test.[jt]s?(x)",
    "**/__tests__/**/*.integration.flaky.test.[jt]s?(x)",
  ],
  testPathIgnorePatterns: ["node_modules", "\\.expo", "coverage"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.flaky.js"],
  collectCoverageFrom: [],
};
