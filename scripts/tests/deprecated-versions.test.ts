import { describe, expect, it } from 'vitest';

import { buildIndex } from '@seedcord/docs-engine';

import { withoutDeprecated } from '../docs/deprecated-versions';

import type { PackageVersionsInput } from '@seedcord/docs-engine';

const plugin: PackageVersionsInput = {
    folder: 'plugin-mongoose',
    fullName: '@seedcord/plugin-mongoose',
    versions: ['1.0.0', '0.2.1', '0.1.4', '1.0.1-next.0']
};

describe('withoutDeprecated', () => {
    it('walks the index head back when the higher versions are deprecated', () => {
        const inputs = withoutDeprecated(
            [plugin],
            new Map([['@seedcord/plugin-mongoose', new Set(['1.0.0', '1.0.1-next.0'])]])
        );
        const index = buildIndex(inputs, { updatedAt: '2026-06-06T00:00:00.000Z' });

        expect(index.packages['plugin-mongoose']?.stable?.latest).toBe('0.2.1');
        expect(index.packages['plugin-mongoose']?.stable?.latestByMajor).toEqual({ '0': '0.2.1' });
    });

    it('keeps every version for a package the registry could not answer for', () => {
        expect(withoutDeprecated([plugin], new Map())).toEqual([plugin]);
    });
});
