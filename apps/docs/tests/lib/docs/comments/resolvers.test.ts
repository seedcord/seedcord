import { describe, expect, it, vi } from 'vitest';

import { resolveInlineHref } from '@lib/docs/comments/resolvers';

import type { FormatContext, InlineTagPart } from '@lib/docs/types';
import type { VersionedDocsEngine } from '@seedcord/docs-engine';

interface SearchHit {
    name: string;
    slug: string;
    packageName: string;
}

function makeContext(searchResults: SearchHit[]): FormatContext {
    // justified: the fixture implements only the engine surface resolveInlineHref's search path reads.
    const engine = {
        search: vi.fn(() => searchResults),
        getNodeByGlobalSlug: vi.fn((pkg: string, slug: string) => ({
            key: `${pkg}!${slug}`,
            name: 'X',
            packageName: pkg
        })),
        getNodeBySlug: vi.fn(() => null),
        resolver: () => ({ href: () => '/resolved' })
    } as unknown as VersionedDocsEngine;
    return { engine, manifestPackage: 'seedcord' };
}

function linkPart(text: string): InlineTagPart {
    // justified: a bare @link display part carries only kind/tag/text here.
    return { kind: 'inline-tag', tag: '@link', text } as unknown as InlineTagPart;
}

describe('resolveInlineHref search fallback', () => {
    it('resolves a link whose label exactly matches a search hit', () => {
        const ctx = makeContext([
            { name: 'CommandRouteString', slug: 'types/command-route-string', packageName: 'seedcord' }
        ]);
        expect(resolveInlineHref(linkPart('CommandRouteString'), ctx)).toBe('/resolved');
    });

    it('does not link when the only hit is a fuzzy, non-exact match', () => {
        // {@link ButtonStyle.Danger} is an external discord.js ref the index cannot resolve, the fuzzy
        // top hit (HasDangerousPermissions) must not become the link target.
        const ctx = makeContext([
            { name: 'HasDangerousPermissions', slug: 'classes/has-dangerous-permissions', packageName: 'seedcord' }
        ]);
        expect(resolveInlineHref(linkPart('ButtonStyle.Danger'), ctx)).toBeNull();
    });
});
