import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('@seedcord/tsconfig', () => {
  it('should have valid base.json configuration', () => {
    const baseConfig = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'base.json'), 'utf8'));

    expect(baseConfig).toBeDefined();
    expect(baseConfig.compilerOptions).toBeDefined();
    expect(baseConfig.compilerOptions.strict).toBe(true);
    expect(baseConfig.compilerOptions.target).toBe('ESNext');
  });

  it('should have valid node.json configuration', () => {
    const nodeConfig = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'node.json'), 'utf8'));

    expect(nodeConfig).toBeDefined();
    expect(nodeConfig.extends).toBe('./base.json');
    expect(nodeConfig.compilerOptions.target).toBe('ES2022');
  });
});
