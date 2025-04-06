/** @format */

// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';


export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.stylistic,
  tseslint.configs.strict,
  prettierConfig,
  {
    ignores: ['node_modules', 'dist', 'build'],
  },
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          args: 'after-used',
          vars: 'all',
        },
      ],
    },
  }
);
