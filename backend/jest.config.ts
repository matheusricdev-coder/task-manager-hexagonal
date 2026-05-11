import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: [
    "src/application/**/*.ts",
    "src/infrastructure/http/**/*.ts",
    "!src/**/*.d.ts",
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
};

export default config;
