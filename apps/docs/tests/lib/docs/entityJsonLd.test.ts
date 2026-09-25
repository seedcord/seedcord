import { describe, expect, it } from 'vitest';

import { entityJsonLd } from '#lib/docs/entityJsonLd';

import type { ResolvedEntity } from '#lib/docs/resolveEntity';

function resolvedAt(id: string): ResolvedEntity {
    // justified: entityJsonLd reads only these fields
    return {
        entry: { id: 'gateway', manifestName: '@seedcord/gateway' },
        version: { id, label: `v${id}` },
        entity: { name: 'Gated', summary: [], displayPackage: 'gateway' },
        segments: ['functions', 'gated']
    } as unknown as ResolvedEntity;
}

interface Graph {
    '@graph': [{ url: string; assemblyVersion: string }, { itemListElement: { item: string }[] }];
}

function graphOf(resolved: ResolvedEntity, latestPath?: string): Graph {
    // justified: Graph lists only the fields these tests read
    return entityJsonLd(resolved, latestPath) as unknown as Graph;
}

describe('entityJsonLd', () => {
    it('describes a page at its latest url when it has one', () => {
        const [api, breadcrumb] = graphOf(resolvedAt('0.7.1'), '/packages/gateway/latest/functions/gated')['@graph'];

        expect(api.url).toBe('https://docs.seedcord.org/packages/gateway/latest/functions/gated');
        expect(api.assemblyVersion).toBe('0.7.1');
        expect(breadcrumb.itemListElement[1]?.item).toBe('https://docs.seedcord.org/packages/gateway/latest');
    });

    it('describes any other page at its own versioned url', () => {
        const [api, breadcrumb] = graphOf(resolvedAt('0.5.1'))['@graph'];

        expect(api.url).toBe('https://docs.seedcord.org/packages/gateway/0.5.1/functions/gated');
        expect(api.assemblyVersion).toBe('0.5.1');
        expect(breadcrumb.itemListElement[1]?.item).toBe('https://docs.seedcord.org/packages/gateway/0.5.1');
    });
});
