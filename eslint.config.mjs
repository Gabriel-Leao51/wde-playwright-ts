// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

const playwrightRecommended = playwright.configs['flat/recommended'];

export default defineConfig(
  { ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'blob-report/'] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  { plugins: playwrightRecommended.plugins },
  {
    files: ['tests/**/*.ts'],
    languageOptions: playwrightRecommended.languageOptions,
    rules: playwrightRecommended.rules,
  },
  {
    // Locator and wait policy from CLAUDE.md, enforced everywhere Playwright code lives
    // (tests, and the page objects/fixtures that land in later sessions).
    files: ['**/*.ts'],
    ignores: ['playwright.config.ts'],
    rules: {
      'playwright/no-raw-locators': 'error',
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-wait-for-selector': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/no-eval': 'error',
      'playwright/no-force-option': 'error',
      'playwright/prefer-web-first-assertions': 'error',
    },
  },
  prettier,
);
