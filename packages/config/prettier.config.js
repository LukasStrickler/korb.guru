// @ts-check

/**
 * @type {import('prettier').Config}
 */
const config = {
  // Formatting
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',

  // Line endings
  endOfLine: 'lf',

  // Whitespace
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',

  // Special formatting
  vueIndentScriptAndStyle: false,

  // File-specific
  singleAttributePerLine: false,

  // Embedding
  embeddedLanguageFormatting: 'auto',

  // Plugins (to be extended by consuming packages)
  plugins: [],
};

export default config;
