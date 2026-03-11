import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('@korb/config', () => {
  const configDir = __dirname;

  it('exports tsconfig.json', () => {
    const tsconfigPath = join(configDir, 'tsconfig.json');
    expect(existsSync(tsconfigPath)).toBe(true);
    const content = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    expect(content.compilerOptions).toBeDefined();
  });

  it('exports tsconfig.base.json', () => {
    const tsconfigPath = join(configDir, 'tsconfig.base.json');
    expect(existsSync(tsconfigPath)).toBe(true);
    const content = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    expect(content.compilerOptions).toBeDefined();
  });

  it('exports eslint.config.js', () => {
    const eslintPath = join(configDir, 'eslint.config.js');
    expect(existsSync(eslintPath)).toBe(true);
  });

  it('exports prettier.config.js', () => {
    const prettierPath = join(configDir, 'prettier.config.js');
    expect(existsSync(prettierPath)).toBe(true);
  });
});
