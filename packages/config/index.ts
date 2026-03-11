/**
 * @korb/config
 * Shared configuration package for the Korb monorepo.
 */

export const configPaths = {
  tsconfig: './tsconfig.json',
  tsconfigBase: './tsconfig.base.json',
  eslint: './eslint.config.js',
  prettier: './prettier.config.js',
} as const;

export const tsconfigDefaults = {
  target: 'ES2022',
  module: 'ESNext',
  moduleResolution: 'Bundler',
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
} as const;

export const eslintRules = {
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'no-debugger': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  curly: ['error', 'all'],
} as const;

export const prettierDefaults = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
} as const;
