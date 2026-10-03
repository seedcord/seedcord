import { describe, expect, it } from 'vitest';

import { entityJsonLd, entityPath } from '#lib/docs/entityJsonLd';

import type { ResolvedEntity } from '#lib/docs/resolveEntity';

function resolvedAt(id: string, segments = ['functions', 'gated']): ResolvedEntity {
    // justified: entityJsonLd reads only these fields
    return {
        entry: { id: 'gateway', manifestName: '@seedcord/gateway' },
        version: { id, label: `v${id}` },
        entity: { name: 'Gated', summary: [], displayPackage: 'gateway' },
        segments
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

        expect(api.url).toBe('https://seedcord.org/docs/packages/gateway/latest/functions/gated');
        expect(api.assemblyVersion).toBe('0.7.1');
        expect(breadcrumb.itemListElement[1]?.item).toBe('https://seedcord.org/docs/packages/gateway/latest');
    });

    it('describes any other page at its own versioned url', () => {
        const [api, breadcrumb] = graphOf(resolvedAt('0.5.1'))['@graph'];

        expect(api.url).toBe('https://seedcord.org/docs/packages/gateway/0.5.1/functions/gated');
        expect(api.assemblyVersion).toBe('0.5.1');
        expect(breadcrumb.itemListElement[1]?.item).toBe('https://seedcord.org/docs/packages/gateway/0.5.1');
    });
});

describe('entityPath', () => {
    // the export writes the page for a namespaced symbol at types/jsx%2Felement
    it('keeps a slash inside a namespaced slug encoded', () => {
        expect(entityPath(resolvedAt('0.5.1', ['types', 'jsx/element']))).toBe(
            '/packages/gateway/0.5.1/types/jsx%2Felement'
        );
    });
});
