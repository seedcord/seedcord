import { relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ApiDocsGenerator } from '@src/generator';

const REPO_ROOT = resolve(__dirname, '../../..');

async function discover(): Promise<string[]> {
    const generator = new ApiDocsGenerator({ logger: { log: () => undefined } });
    const dirs = await generator.discoverPackages();
    return dirs.map((dir) => relative(REPO_ROOT, dir));
}

describe('workspace discovery', () => {
    it('finds packages under every workspace root', async () => {
        const dirs = await discover();
        expect(dirs).toContain('packages/gateway');
        expect(dirs).toContain('plugins/kysely-postgres');
    });

    it('skips private packages', async () => {
        const dirs = await discover();
        expect(dirs).not.toContain('packages/docs-generator');
        expect(dirs).not.toContain('apps/docs');
        expect(dirs).not.toContain('mock');
    });
});
