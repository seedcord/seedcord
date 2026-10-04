import { DocKind } from '@seedcord/docs-engine/client';
import { describe, expect, it } from 'vitest';

import { ActiveVersion } from '#lib/docs/ActiveVersion';

import { docNode, fixtureEngine } from '#tests/fixtures/docsEngine';

import type { FixtureVersion } from '#tests/fixtures/docsEngine';

const CORE: FixtureVersion[] = [
    {
        version: '0.9.2',
        readme: '# core',
        nodes: (pkg) => [
            docNode(pkg, 'Bus', { kind: DocKind.Class }),
            docNode(pkg, 'Hidden', { kind: DocKind.Class, isExported: false })
        ]
    },
    { version: '0.8.0', nodes: (pkg) => [docNode(pkg, 'OldBus', { kind: DocKind.Class })] }
];

const hrefsOf = (active: ActiveVersion | null): string[] =>
    (active?.categories ?? []).flatMap(({ items }) => items.map(({ href }) => href));

describe('ActiveVersion', () => {
    it('links its symbols under latest on a latest page', async () => {
        const active = await ActiveVersion.open(fixtureEngine('core', '@seedcord/core', CORE), 'core', 'latest');

        expect(hrefsOf(active)).toEqual(['/packages/core/latest/classes/bus']);
    });

    it('links its symbols under the version a pinned page shows', async () => {
        const active = await ActiveVersion.open(fixtureEngine('core', '@seedcord/core', CORE), 'core', '0.9.2');

        expect(hrefsOf(active)).toEqual(['/packages/core/0.9.2/classes/bus']);
    });

    it('keeps its own version after the engine opens another one', async () => {
        const engine = fixtureEngine('core', '@seedcord/core', CORE);
        const newest = await ActiveVersion.open(engine, 'core', '0.9.2');
        await ActiveVersion.open(engine, 'core', '0.8.0');

        expect(hrefsOf(newest)).toEqual(['/packages/core/0.9.2/classes/bus']);
        expect(newest?.readme).toBe('# core');
    });

    it('gives a page to a symbol the sidebar leaves out', async () => {
        const active = await ActiveVersion.open(fixtureEngine('core', '@seedcord/core', CORE), 'core', '0.9.2');

        expect(active?.pages.map(({ label }) => label)).toEqual(['Bus', 'Hidden']);
    });

    it('opens nothing for a version the index does not list', async () => {
        await expect(
            ActiveVersion.open(fixtureEngine('core', '@seedcord/core', CORE), 'core', '0.1.0')
        ).resolves.toBeNull();
    });
});
