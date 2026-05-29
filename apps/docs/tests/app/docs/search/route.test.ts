import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '../../../../src/app/docs/search/route';

import type { DocNode, DocSearchEntry } from '@seedcord/docs-engine';
import type { NextRequest } from 'next/server';

// justified: typedoc lives in docs-engine, not this app, so the ReflectionKind enum can't be imported from the test bundle. Mirror the 0.28.x bitflag contract by value.
const Kind = {
    Module: 2,
    Namespace: 4,
    Enum: 8,
    EnumMember: 16,
    Variable: 32,
    Function: 64,
    Class: 128,
    Interface: 256,
    Constructor: 512,
    Property: 1024,
    Method: 2048,
    CallSignature: 4096,
    ConstructorSignature: 16384,
    Parameter: 32768,
    TypeParameter: 131072,
    Accessor: 262144,
    GetSignature: 524288,
    SetSignature: 1048576,
    TypeAlias: 2097152
} as const;

const engineStub = {
    search: vi.fn<(query: string, pkgName?: string) => DocSearchEntry[]>(),
    listPackages: vi.fn<() => string[]>(),
    getNodeByGlobalSlug: vi.fn<(packageName: string, slug: string) => DocNode | null>(),
    getNodeBySlug: vi.fn<(packageName: string, slug: string) => DocNode | null>()
};

vi.mock('@lib/docs/engine', () => ({
    getDocsEngine: () => Promise.resolve(engineStub)
}));

function makeRequest(url: string): NextRequest {
    // justified: route only reads nextUrl.searchParams; the real NextRequest constructor pulls in heavy Next internals.
    return { nextUrl: new URL(url) } as unknown as NextRequest;
}

function makeEntry(overrides: Partial<DocSearchEntry> = {}): DocSearchEntry {
    return {
        slug: 'thing',
        name: 'Thing',
        qualifiedName: 'Thing',
        packageName: 'seedcord',
        packageVersion: '1.0.0',
        kind: Kind.Class,
        summary: null,
        tokens: [],
        ...overrides
    } satisfies DocSearchEntry;
}

beforeEach(() => {
    engineStub.search.mockReset();
    engineStub.listPackages.mockReset();
    engineStub.getNodeByGlobalSlug.mockReset();
    engineStub.getNodeBySlug.mockReset();

    engineStub.listPackages.mockReturnValue(['seedcord']);
    engineStub.getNodeByGlobalSlug.mockReturnValue(null);
    engineStub.getNodeBySlug.mockReturnValue(null);
    engineStub.search.mockReturnValue([]);
});

describe('GET /docs/search: query validation', () => {
    it('returns an empty result set when q is missing', async () => {
        const res = await GET(makeRequest('https://example.com/docs/search'));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
    });

    it('returns an empty result set when q is blank', async () => {
        const res = await GET(makeRequest('https://example.com/docs/search?q='));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
    });

    it('returns an empty result set for a query shorter than 3 chars after trim', async () => {
        const res = await GET(makeRequest('https://example.com/docs/search?q=ab'));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
    });

    it('treats a whitespace-only query as empty', async () => {
        const res = await GET(makeRequest('https://example.com/docs/search?q=%20%20'));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
    });

    it('trims surrounding whitespace before forwarding to engine.search', async () => {
        await GET(makeRequest('https://example.com/docs/search?q=%20%20Logger%20%20'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger', undefined);
    });

    it('forwards the query verbatim (case is preserved; engine does its own matching)', async () => {
        await GET(makeRequest('https://example.com/docs/search?q=LoGgEr'));
        expect(engineStub.search).toHaveBeenCalledWith('LoGgEr', undefined);
    });
});

describe('GET /docs/search: pkg parameter', () => {
    it('omits the package filter when pkg is absent', async () => {
        await GET(makeRequest('https://example.com/docs/search?q=Logger'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger', undefined);
    });

    it('resolves a pkg alias through resolveManifestPackageName', async () => {
        engineStub.listPackages.mockReturnValue(['seedcord', '@seedcord/services']);
        await GET(makeRequest('https://example.com/docs/search?q=Logger&pkg=services'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger', '@seedcord/services');
    });

    it('is case-insensitive on the pkg alias', async () => {
        engineStub.listPackages.mockReturnValue(['seedcord', '@seedcord/services']);
        await GET(makeRequest('https://example.com/docs/search?q=Logger&pkg=SERVICES'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger', '@seedcord/services');
    });

    it('falls back to the default manifest package for an unknown pkg', async () => {
        engineStub.listPackages.mockReturnValue(['seedcord', '@seedcord/services']);
        await GET(makeRequest('https://example.com/docs/search?q=Logger&pkg=nope'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger', 'seedcord');
    });
});

describe('GET /docs/search: KIND_TO_RESULT canonical mapping (H8 regression)', () => {
    const cases: Array<[number, string, string]> = [
        [Kind.Class, 'Class', 'class'],
        [Kind.Interface, 'Interface', 'interface'],
        [Kind.Enum, 'Enum', 'enum'],
        [Kind.EnumMember, 'EnumMember', 'enumMember'],
        [Kind.TypeAlias, 'TypeAlias', 'type'],
        [Kind.TypeParameter, 'TypeParameter', 'typeParameter'],
        [Kind.Function, 'Function', 'function'],
        [Kind.Method, 'Method', 'method'],
        [Kind.Constructor, 'Constructor', 'constructor'],
        [Kind.CallSignature, 'CallSignature', 'function'],
        [Kind.ConstructorSignature, 'ConstructorSignature', 'constructor'],
        [Kind.GetSignature, 'GetSignature', 'property'],
        [Kind.SetSignature, 'SetSignature', 'property'],
        [Kind.Accessor, 'Accessor', 'property'],
        [Kind.Property, 'Property', 'property'],
        [Kind.Variable, 'Variable', 'variable'],
        [Kind.Parameter, 'Parameter', 'parameter']
    ];

    it.each(cases)('maps Kind.%s to "%s"', async (kind, _label, expected) => {
        engineStub.search.mockReturnValue([makeEntry({ slug: `item-${expected}`, kind })]);

        const res = await GET(makeRequest('https://example.com/docs/search?q=item'));
        const body = (await res.json()) as { results: Array<{ kind: string }> };
        expect(body.results).toHaveLength(1);
        expect(body.results[0]?.kind).toBe(expected);
    });

    it('falls back to "page" for a ReflectionKind absent from the lookup table', async () => {
        // justified: Kind.Namespace and Module are intentionally absent from KIND_TO_RESULT, so they collapse to "page".
        engineStub.search.mockReturnValue([makeEntry({ slug: 'space', kind: Kind.Namespace })]);

        const res = await GET(makeRequest('https://example.com/docs/search?q=space'));
        const body = (await res.json()) as { results: Array<{ kind: string; href: string }> };
        expect(body.results).toHaveLength(1);
        expect(body.results[0]?.kind).toBe('page');
        expect(body.results[0]?.href).toBe('/docs/packages/seedcord/1.0.0/space');
    });
});

describe('GET /docs/search: response shape', () => {
    it('includes id, label, path, href, kind and an optional description', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({
                slug: 'logger',
                name: 'Logger',
                qualifiedName: 'Logger',
                kind: Kind.Class,
                summary: 'A logger.'
            })
        ]);

        const res = await GET(makeRequest('https://example.com/docs/search?q=Logger'));
        const body = (await res.json()) as { results: Array<Record<string, unknown>> };
        expect(body.results).toHaveLength(1);
        expect(body.results[0]).toMatchObject({
            id: 'seedcord:logger:128',
            label: 'Logger',
            kind: 'class',
            description: 'A logger.',
            href: '/docs/packages/seedcord/1.0.0/classes/logger'
        });
        expect(body.results[0]?.path).toContain('seedcord');
    });

    it('omits description when the entry has no summary', async () => {
        engineStub.search.mockReturnValue([makeEntry({ slug: 'logger', kind: Kind.Class, summary: null })]);

        const res = await GET(makeRequest('https://example.com/docs/search?q=Logger'));
        const body = (await res.json()) as { results: Array<Record<string, unknown>> };
        expect(body.results[0]).not.toHaveProperty('description');
    });

    it('uses the qualified name in the breadcrumb when it differs from the entry name', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({
                slug: 'logger/info',
                name: 'info',
                qualifiedName: 'Logger.info',
                kind: Kind.Method
            })
        ]);

        const res = await GET(makeRequest('https://example.com/docs/search?q=info'));
        const body = (await res.json()) as { results: Array<{ path: string }> };
        expect(body.results[0]?.path).toBe('seedcord@1.0.0 · Logger.info');
    });

    it('drops entries with an empty slug', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({ slug: '', kind: Kind.Class }),
            makeEntry({ slug: 'keeper', kind: Kind.Class })
        ]);

        const res = await GET(makeRequest('https://example.com/docs/search?q=item'));
        const body = (await res.json()) as { results: Array<{ id: string }> };
        expect(body.results).toHaveLength(1);
        expect(body.results[0]?.id).toBe('seedcord:keeper:128');
    });
});

describe('GET /docs/search: grouping and limits', () => {
    it('collapses duplicate (slug, resultKind) groups, preferring the default manifest package', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({ slug: 'logger', packageName: '@seedcord/services', kind: Kind.Class }),
            makeEntry({ slug: 'logger', packageName: 'seedcord', kind: Kind.Class })
        ]);

        const res = await GET(makeRequest('https://example.com/docs/search?q=Logger'));
        const body = (await res.json()) as { results: Array<{ id: string }> };
        expect(body.results).toHaveLength(1);
        expect(body.results[0]?.id).toBe('seedcord:logger:128');
    });

    it('keeps distinct entries when slug matches but resultKind differs', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({ slug: 'logger', kind: Kind.Class }),
            makeEntry({ slug: 'logger', kind: Kind.Interface })
        ]);

        const res = await GET(makeRequest('https://example.com/docs/search?q=Logger'));
        const body = (await res.json()) as { results: Array<{ kind: string }> };
        expect(body.results.map((r) => r.kind).sort()).toEqual(['class', 'interface']);
    });

    it('caps the response at MAX_RESULTS (24) entries', async () => {
        const MANY = 40;
        engineStub.search.mockReturnValue(
            Array.from({ length: MANY }, (_, idx) => makeEntry({ slug: `entry-${idx}`, kind: Kind.Class }))
        );

        const res = await GET(makeRequest('https://example.com/docs/search?q=entry'));
        const body = (await res.json()) as { results: unknown[] };
        expect(body.results).toHaveLength(24);
    });
});
