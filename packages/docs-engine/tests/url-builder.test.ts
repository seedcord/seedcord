import { describe, expect, it } from 'vitest';

import { buildEntityHref, buildPackageBasePath, parseEntityPathSegments } from '@routing/url-builder';

describe('buildEntityHref', () => {
    it('builds a full href with package, version, tone directory and slug', () => {
        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'mock-class',
                version: '1.2.3',
                tone: 'class'
            })
        ).toBe('/packages/seedcord/1.2.3/classes/mock-class');
    });

    it('maps scoped manifest names to their display segment', () => {
        expect(
            buildEntityHref({
                name: '@seedcord/services',
                slug: 'logger',
                version: '0.1.0',
                tone: 'interface'
            })
        ).toBe('/packages/services/0.1.0/interfaces/logger');
    });

    it('falls back to the latest version segment when version is omitted', () => {
        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'foo',
                tone: 'function'
            })
        ).toBe('/packages/seedcord/latest/functions/foo');
    });

    it('falls back to the latest version segment when version is null', () => {
        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'foo',
                version: null,
                tone: 'enum'
            })
        ).toBe('/packages/seedcord/latest/enums/foo');
    });

    it('omits the tone directory when tone is null or undefined (root entity)', () => {
        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'index',
                version: '1.0.0'
            })
        ).toBe('/packages/seedcord/1.0.0/index');

        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'index',
                version: '1.0.0',
                tone: null
            })
        ).toBe('/packages/seedcord/1.0.0/index');
    });

    it('resolves unknown tone strings to the class fallback directory', () => {
        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'thing',
                version: '1.0.0',
                tone: 'totally-bogus-kind'
            })
        ).toBe('/packages/seedcord/1.0.0/classes/thing');
    });

    it('resolves tone synonyms (method -> function, alias -> type)', () => {
        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'doThing',
                version: '1.0.0',
                tone: 'method'
            })
        ).toBe('/packages/seedcord/1.0.0/functions/doThing');

        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'MyAlias',
                version: '1.0.0',
                tone: 'alias'
            })
        ).toBe('/packages/seedcord/1.0.0/types/MyAlias');
    });

    it('URI-encodes slug segments containing special characters', () => {
        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'foo bar/baz',
                version: '1.0.0',
                tone: 'class'
            })
        ).toBe(`/packages/seedcord/1.0.0/classes/${encodeURIComponent('foo bar/baz')}`);
    });

    it('URI-encodes version segments containing special characters', () => {
        expect(
            buildEntityHref({
                name: 'seedcord',
                slug: 'foo',
                version: '1.0.0-beta+build.1',
                tone: 'class'
            })
        ).toBe(`/packages/seedcord/${encodeURIComponent('1.0.0-beta+build.1')}/classes/foo`);
    });
});

describe('buildPackageBasePath', () => {
    it('builds the canonical package base path with a version', () => {
        expect(buildPackageBasePath('seedcord', '1.0.0')).toBe('/packages/seedcord/1.0.0');
    });

    it('maps scoped manifest names to their display segment', () => {
        expect(buildPackageBasePath('@seedcord/services', '0.1.0')).toBe('/packages/services/0.1.0');
    });

    it('falls back to "latest" when version is null', () => {
        expect(buildPackageBasePath('seedcord', null)).toBe('/packages/seedcord/latest');
    });

    it('falls back to "latest" when version is undefined', () => {
        expect(buildPackageBasePath('seedcord', undefined)).toBe('/packages/seedcord/latest');
    });

    it('URI-encodes version segments containing special characters', () => {
        expect(buildPackageBasePath('seedcord', '1.0.0 rc1')).toBe(
            `/packages/seedcord/${encodeURIComponent('1.0.0 rc1')}`
        );
    });
});

describe('parseEntityPathSegments', () => {
    it('returns empty parse for undefined input', () => {
        expect(parseEntityPathSegments(undefined)).toStrictEqual({
            tone: null,
            slug: null,
            rawSegments: []
        });
    });

    it('returns empty parse for null input', () => {
        expect(parseEntityPathSegments(null)).toStrictEqual({
            tone: null,
            slug: null,
            rawSegments: []
        });
    });

    it('returns empty parse for empty array input', () => {
        expect(parseEntityPathSegments([])).toStrictEqual({
            tone: null,
            slug: null,
            rawSegments: []
        });
    });

    it('parses a tone directory with no slug as a category-only path', () => {
        expect(parseEntityPathSegments(['classes'])).toStrictEqual({
            tone: 'class',
            slug: null,
            rawSegments: ['classes']
        });
    });

    it('parses a tone directory plus slug', () => {
        expect(parseEntityPathSegments(['classes', 'mock-class'])).toStrictEqual({
            tone: 'class',
            slug: 'mock-class',
            rawSegments: ['classes', 'mock-class']
        });
    });

    it('joins multi-part slugs with "/"', () => {
        expect(parseEntityPathSegments(['interfaces', 'parent', 'child'])).toStrictEqual({
            tone: 'interface',
            slug: 'parent/child',
            rawSegments: ['interfaces', 'parent', 'child']
        });
    });

    it('decodes URI-encoded slug segments', () => {
        const encoded = encodeURIComponent('foo bar');
        expect(parseEntityPathSegments(['functions', encoded])).toStrictEqual({
            tone: 'function',
            slug: 'foo bar',
            rawSegments: ['functions', encoded]
        });
    });

    it('falls back to the class tone for malformed tone segments', () => {
        expect(parseEntityPathSegments(['not-a-real-kind', 'thing'])).toStrictEqual({
            tone: 'class',
            slug: 'thing',
            rawSegments: ['not-a-real-kind', 'thing']
        });
    });

    it('treats an empty leading segment as a missing tone (null)', () => {
        expect(parseEntityPathSegments([''])).toStrictEqual({
            tone: null,
            slug: null,
            rawSegments: ['']
        });
    });

    it('resolves tone synonyms in the leading segment', () => {
        expect(parseEntityPathSegments(['enumeration', 'Color'])).toStrictEqual({
            tone: 'enum',
            slug: 'Color',
            rawSegments: ['enumeration', 'Color']
        });
    });

    it('handles version-less / engine-style raw segments without losing fidelity', () => {
        const segments = ['types', 'PackageVersionCatalog'];
        const parsed = parseEntityPathSegments(segments);
        expect(parsed.tone).toBe('type');
        expect(parsed.slug).toBe('PackageVersionCatalog');
        expect(parsed.rawSegments).toBe(segments);
    });
});
