import { describe, expect, it, vi } from 'vitest';

import type { ResolvedEntity } from '#lib/docs/resolveEntity';
import type { PackageIndexEntry } from '@seedcord/docs-engine';

const OLD_VERSION = {
    id: '0.5.1',
    label: 'v0.5.1',
    basePath: '/packages/gateway/0.5.1',
    isLatest: false,
    badge: null,
    channel: 'stable',
    categories: []
} as const;

const LATEST_VERSION = { ...OLD_VERSION, id: '0.7.1', label: 'v0.7.1', isLatest: true, badge: 'latest' } as const;

const RESOLVED = {
    entry: {
        id: 'gateway',
        manifestName: '@seedcord/gateway',
        label: 'gateway',
        description: '',
        workspace: 'packages',
        symbolCounts: new Map(),
        versions: [LATEST_VERSION, OLD_VERSION]
    },
    version: OLD_VERSION,
    // justified: generateMetadata reads only these fields of the entity model
    entity: {
        name: 'Gated',
        kind: 'function',
        summary: [],
        manifestPackage: '@seedcord/gateway',
        displayPackage: 'gateway'
    },
    segments: ['functions', 'gated']
} as unknown as ResolvedEntity;

const INDEX_ENTRY: PackageIndexEntry = {
    fullName: '@seedcord/gateway',
    stable: { latest: '0.7.1', latestByMinor: { '0.5': '0.5.1', '0.7': '0.7.1' }, latestByMajor: { '0': '0.7.1' } },
    prerelease: null,
    entities: { gated: 'function' }
};

vi.mock('#lib/docs/resolveEntity', () => ({ resolveEntity: () => Promise.resolve(RESOLVED) }));
vi.mock('#lib/docs/engine', () => ({
    getDocsEngine: () => Promise.resolve({ getEntry: () => Promise.resolve(INDEX_ENTRY) })
}));

const { generateMetadata } = await import('#src/app/(docs)/packages/[packageId]/[versionId]/[...entitySegments]/page');

describe('entity page metadata', () => {
    it('points an older version at the latest url of the same symbol', async () => {
        const metadata = await generateMetadata({
            params: Promise.resolve({
                packageId: 'gateway',
                versionId: '0.5.1',
                entitySegments: ['functions', 'gated']
            })
        });

        expect(metadata.alternates?.canonical).toBe(
            'https://docs.seedcord.org/packages/gateway/latest/functions/gated'
        );
    });
});
