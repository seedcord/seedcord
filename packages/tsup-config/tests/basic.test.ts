import { describe, it, expect } from 'vitest';
import { createTsupConfig } from '../src/index';

describe('@seedcord/tsup-config', () => {
  it('should export createTsupConfig function', () => {
    expect(createTsupConfig).toBeDefined();
    expect(typeof createTsupConfig).toBe('function');
  });

  it('should create default config', () => {
    const config = createTsupConfig();
    expect(config).toBeDefined();
  });

  it('should create config with custom options', () => {
    const config = createTsupConfig({
      entry: ['src/custom.ts'],
      minify: true
    });
    expect(config).toBeDefined();
  });
});
