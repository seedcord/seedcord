import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/(docs)/search/route';

import { MIN_SEARCH_QUERY_LENGTH } from '@components/search/command-palette/constants';

import type { DocNode, DocSearchEntry } from '@seedcord/docs-engine';
import type { NextRequest } from 'next/server';

// Mirror DocKind: the kind enum isn't exported from @seedcord/docs-engine, so the test pins its bitflag values.
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

type StubChannelEntry = { stable: { latest: string } | null; prerelease: { latest: string } | null };

const engineStub = {
    search: vi.fn<(query: string, pkgName?: string) => DocSearchEntry[]>(),
    listPackages: vi.fn<() => Promise<{ folder: string; fullName: string }[]>>(),
    setVersion: vi.fn<(folder: string, selector: string) => Promise<void>>(),
    getEntry: vi.fn<(folder: string) => Promise<StubChannelEntry | null>>(),
    getNodeByGlobalSlug: vi.fn<(packageName: string, slug: string) => DocNode | null>(),
    getNodeBySlug: vi.fn<(packageName: string, slug: string) => DocNode | null>()
};

vi.mock('@lib/docs/engine', () => ({
    getDocsEngine: () => Promise.resolve(engineStub)
}));

function makeRequest(url: string): NextRequest {
    // justified: the real NextRequest constructor pulls in Next internals.
    return { nextUrl: new URL(url), headers: new Headers() } as unknown as NextRequest;
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

interface ResultPayload {
    id: string;
    label: string;
    path: string;
    href: string;
    kind: string;
    description?: string;
}

async function flatResults(res: Response): Promise<ResultPayload[]> {
    const body = (await res.json()) as { results?: ResultPayload[] };
    return body.results ?? [];
}

beforeEach(() => {
    engineStub.search.mockReset();
    engineStub.listPackages.mockReset();
    engineStub.setVersion.mockReset();
    engineStub.getEntry.mockReset();
    engineStub.getNodeByGlobalSlug.mockReset();
    engineStub.getNodeBySlug.mockReset();

    engineStub.listPackages.mockResolvedValue([{ folder: 'seedcord', fullName: 'seedcord' }]);
    engineStub.setVersion.mockResolvedValue(undefined);
    engineStub.getEntry.mockResolvedValue({ stable: { latest: '1.0.0' }, prerelease: null });
    engineStub.getNodeByGlobalSlug.mockReturnValue(null);
    engineStub.getNodeBySlug.mockReturnValue(null);
    engineStub.search.mockReturnValue([]);
});

describe('GET /search: query validation', () => {
    it('returns no results when q is missing', async () => {
        const res = await GET(makeRequest('https://example.com/search'));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
    });

    it('returns no results when q is blank', async () => {
        const res = await GET(makeRequest('https://example.com/search?q='));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
    });

    it('returns no results for a query shorter than the minimum length after trim', async () => {
        const res = await GET(makeRequest(`https://example.com/search?q=${'a'.repeat(MIN_SEARCH_QUERY_LENGTH - 1)}`));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
    });

    it('treats a whitespace-only query as empty', async () => {
        const res = await GET(makeRequest('https://example.com/search?q=%20%20'));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
    });

    it('trims surrounding whitespace before forwarding to engine.search', async () => {
        await GET(makeRequest('https://example.com/search?q=%20%20Logger%20%20'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger');
    });

    it('forwards the query verbatim, leaving case to the engine', async () => {
        await GET(makeRequest('https://example.com/search?q=LoGgEr'));
        expect(engineStub.search).toHaveBeenCalledWith('LoGgEr');
    });
});

describe('GET /search: scope parameter', () => {
    beforeEach(() => {
        engineStub.listPackages.mockResolvedValue([
            { folder: 'seedcord', fullName: 'seedcord' },
            { folder: 'logger', fullName: '@seedcord/logger' }
        ]);
    });

    it("defaults to scope 'all', searching every loaded package", async () => {
        await GET(makeRequest('https://example.com/search?q=Logger'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger');
        expect(engineStub.setVersion).toHaveBeenCalledWith('seedcord', 'latest');
        expect(engineStub.setVersion).toHaveBeenCalledWith('logger', '1.0.0');
    });

    it('scopes the search to one package (resolved through resolvePackageIdentity)', async () => {
        await GET(makeRequest('https://example.com/search?q=Logger&scope=logger'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger', '@seedcord/logger');
        expect(engineStub.setVersion).toHaveBeenCalledTimes(1);
        expect(engineStub.setVersion).toHaveBeenCalledWith('logger', '1.0.0');
    });

    it('is case-insensitive on the scope alias', async () => {
        await GET(makeRequest('https://example.com/search?q=Logger&scope=LOGGER'));
        expect(engineStub.search).toHaveBeenCalledWith('Logger', '@seedcord/logger');
    });
});

describe('GET /search: version and channel selection', () => {
    beforeEach(() => {
        engineStub.listPackages.mockResolvedValue([
            { folder: 'seedcord', fullName: 'seedcord' },
            { folder: 'logger', fullName: '@seedcord/logger' }
        ]);
        engineStub.getEntry.mockResolvedValue({ stable: { latest: '2.1.0' }, prerelease: { latest: '3.0.0-next.1' } });
    });

    it('searches the viewed package at its URL version so older versions stay searchable', async () => {
        await GET(makeRequest('https://example.com/search?q=Logger&pkg=seedcord&version=0.5.0'));
        expect(engineStub.setVersion).toHaveBeenCalledWith('seedcord', '0.5.0');
    });

    it('searches other packages at their stable head when the toggle is off', async () => {
        await GET(makeRequest('https://example.com/search?q=Logger&pkg=seedcord'));
        expect(engineStub.setVersion).toHaveBeenCalledWith('logger', '2.1.0');
    });

    it('searches other packages at their pre-release head when the toggle is on', async () => {
        await GET(makeRequest('https://example.com/search?q=Logger&pkg=seedcord&prerelease=1'));
        expect(engineStub.setVersion).toHaveBeenCalledWith('logger', '3.0.0-next.1');
    });

    it('falls back to the pre-release head when a package has no stable and the toggle is off', async () => {
        engineStub.getEntry.mockResolvedValue({ stable: null, prerelease: { latest: '3.0.0-next.1' } });
        await GET(makeRequest('https://example.com/search?q=Logger&pkg=seedcord'));
        expect(engineStub.setVersion).toHaveBeenCalledWith('logger', '3.0.0-next.1');
    });

    it('falls back to the stable head when a package has no pre-release and the toggle is on', async () => {
        engineStub.getEntry.mockResolvedValue({ stable: { latest: '2.1.0' }, prerelease: null });
        await GET(makeRequest('https://example.com/search?q=Logger&pkg=seedcord&prerelease=1'));
        expect(engineStub.setVersion).toHaveBeenCalledWith('logger', '2.1.0');
    });

    it('skips another package only when it has nothing in either channel', async () => {
        engineStub.getEntry.mockResolvedValue({ stable: null, prerelease: null });
        await GET(makeRequest('https://example.com/search?q=Logger&pkg=seedcord'));
        expect(engineStub.setVersion).toHaveBeenCalledTimes(1);
        expect(engineStub.setVersion).toHaveBeenCalledWith('seedcord', 'latest');
    });

    it('searches a pre-release-only package scoped from another package with the toggle off', async () => {
        engineStub.getEntry.mockResolvedValue({ stable: null, prerelease: { latest: '3.0.0-next.1' } });
        await GET(makeRequest('https://example.com/search?q=Logger&pkg=seedcord&scope=logger'));
        expect(engineStub.setVersion).toHaveBeenCalledWith('logger', '3.0.0-next.1');
        expect(engineStub.search).toHaveBeenCalledWith('Logger', '@seedcord/logger');
    });

    it('returns no results when the index has no packages', async () => {
        engineStub.listPackages.mockResolvedValue([]);
        const res = await GET(makeRequest('https://example.com/search?q=Logger'));
        await expect(res.json()).resolves.toEqual({ results: [] });
        expect(engineStub.search).not.toHaveBeenCalled();
        expect(engineStub.setVersion).not.toHaveBeenCalled();
    });
});

describe('GET /search: package listing', () => {
    it('maps listPackages to the packages payload for list=packages without searching', async () => {
        engineStub.listPackages.mockResolvedValue([
            { folder: 'seedcord', fullName: 'seedcord' },
            { folder: 'logger', fullName: '@seedcord/logger' }
        ]);

        const res = await GET(makeRequest('https://example.com/search?list=packages'));
        await expect(res.json()).resolves.toEqual({
            packages: [
                { folder: 'seedcord', label: 'seedcord' },
                { folder: 'logger', label: 'logger' }
            ]
        });
        expect(engineStub.search).not.toHaveBeenCalled();
    });
});

describe('GET /search: kind filter', () => {
    it('keeps only the matching kind', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({ slug: 'logger', kind: Kind.Class }),
            makeEntry({ slug: 'log-level', kind: Kind.Enum })
        ]);

        const res = await GET(makeRequest('https://example.com/search?q=log&kind=enum'));
        const results = await flatResults(res);
        expect(results.map((r) => r.kind)).toEqual(['enum']);
    });

    it("treats 'member' as any member kind", async () => {
        engineStub.search.mockReturnValue([
            makeEntry({ slug: 'logger', kind: Kind.Class }),
            makeEntry({ slug: 'logger/info', kind: Kind.Method }),
            makeEntry({ slug: 'logger/level', kind: Kind.Property })
        ]);

        const res = await GET(makeRequest('https://example.com/search?q=log&kind=member'));
        const results = await flatResults(res);
        expect(results.map((r) => r.kind).sort()).toEqual(['method', 'property']);
    });
});

describe('GET /search: KIND_TO_RESULT canonical mapping (H8 regression)', () => {
    const cases: Array<[string, string, number]> = [
        ['Class', 'class', Kind.Class],
        ['Interface', 'interface', Kind.Interface],
        ['Enum', 'enum', Kind.Enum],
        ['EnumMember', 'enumMember', Kind.EnumMember],
        ['TypeAlias', 'type', Kind.TypeAlias],
        ['TypeParameter', 'typeParameter', Kind.TypeParameter],
        ['Function', 'function', Kind.Function],
        ['Method', 'method', Kind.Method],
        ['Constructor', 'constructor', Kind.Constructor],
        ['CallSignature', 'function', Kind.CallSignature],
        ['ConstructorSignature', 'constructor', Kind.ConstructorSignature],
        ['GetSignature', 'property', Kind.GetSignature],
        ['SetSignature', 'property', Kind.SetSignature],
        ['Accessor', 'property', Kind.Accessor],
        ['Property', 'property', Kind.Property],
        ['Variable', 'variable', Kind.Variable],
        ['Parameter', 'parameter', Kind.Parameter]
    ];

    it.each(cases)('maps %s to "%s"', async (_label, expected, kind) => {
        engineStub.search.mockReturnValue([makeEntry({ slug: `item-${expected}`, kind })]);

        const res = await GET(makeRequest('https://example.com/search?q=item'));
        const results = await flatResults(res);
        expect(results).toHaveLength(1);
        expect(results[0]?.kind).toBe(expected);
    });

    it('falls back to "page" for a ReflectionKind absent from the lookup table', async () => {
        // Kind.Namespace and Module are intentionally absent from KIND_TO_RESULT, so they collapse to "page".
        engineStub.search.mockReturnValue([makeEntry({ slug: 'space', kind: Kind.Namespace })]);

        const res = await GET(makeRequest('https://example.com/search?q=space'));
        const results = await flatResults(res);
        expect(results).toHaveLength(1);
        expect(results[0]?.kind).toBe('page');
        expect(results[0]?.href).toBe('/packages/seedcord/1.0.0/space');
    });
});

describe('GET /search: response shape', () => {
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

        const res = await GET(makeRequest('https://example.com/search?q=Logger'));
        const results = await flatResults(res);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            id: 'seedcord:logger:128',
            label: 'Logger',
            kind: 'class',
            description: 'A logger.',
            href: '/packages/seedcord/1.0.0/classes/logger'
        });
        expect(results[0]?.path).toContain('seedcord');
    });

    it('returns a flat results array (no per-package grouping)', async () => {
        engineStub.search.mockReturnValue([makeEntry({ slug: 'logger', kind: Kind.Class })]);

        const res = await GET(makeRequest('https://example.com/search?q=Logger'));
        const body = (await res.json()) as Record<string, unknown>;
        expect(body).not.toHaveProperty('groups');
        expect(Array.isArray(body.results)).toBe(true);
    });

    it('omits description when the entry has no summary', async () => {
        engineStub.search.mockReturnValue([makeEntry({ slug: 'logger', kind: Kind.Class, summary: null })]);

        const res = await GET(makeRequest('https://example.com/search?q=Logger'));
        const results = await flatResults(res);
        expect(results[0]).not.toHaveProperty('description');
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

        const res = await GET(makeRequest('https://example.com/search?q=info'));
        const results = await flatResults(res);
        expect(results[0]?.path).toBe('seedcord@1.0.0 · Logger.info');
    });

    it('drops entries with an empty slug', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({ slug: '', kind: Kind.Class }),
            makeEntry({ slug: 'keeper', kind: Kind.Class })
        ]);

        const res = await GET(makeRequest('https://example.com/search?q=item'));
        const results = await flatResults(res);
        expect(results).toHaveLength(1);
        expect(results[0]?.id).toBe('seedcord:keeper:128');
    });
});

describe('GET /search: dedupe and limits', () => {
    it('collapses overload duplicates (same package, slug, kind) to one entry', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({ slug: 'logger/info', kind: Kind.Method }),
            makeEntry({ slug: 'logger/info', kind: Kind.Method })
        ]);

        const res = await GET(makeRequest('https://example.com/search?q=info'));
        const results = await flatResults(res);
        expect(results).toHaveLength(1);
    });

    it('keeps a same-named entity in another package as a distinct result', async () => {
        engineStub.listPackages.mockResolvedValue([
            { folder: 'seedcord', fullName: 'seedcord' },
            { folder: 'logger', fullName: '@seedcord/logger' }
        ]);
        engineStub.search.mockReturnValue([
            makeEntry({ slug: 'logger', packageName: 'seedcord', kind: Kind.Class }),
            makeEntry({ slug: 'logger', packageName: '@seedcord/logger', kind: Kind.Class })
        ]);

        const res = await GET(makeRequest('https://example.com/search?q=Logger'));
        const results = await flatResults(res);
        expect(results).toHaveLength(2);
        expect(results.map((r) => r.id)).toEqual(['seedcord:logger:128', '@seedcord/logger:logger:128']);
    });

    it('keeps distinct entries when slug matches but resultKind differs', async () => {
        engineStub.search.mockReturnValue([
            makeEntry({ slug: 'logger', kind: Kind.Class }),
            makeEntry({ slug: 'logger', kind: Kind.Interface })
        ]);

        const res = await GET(makeRequest('https://example.com/search?q=Logger'));
        const results = await flatResults(res);
        expect(results.map((r) => r.kind).sort()).toEqual(['class', 'interface']);
    });

    it('caps the response at MAX_RESULTS (24) entries', async () => {
        const MANY = 40;
        engineStub.search.mockReturnValue(
            Array.from({ length: MANY }, (_, idx) => makeEntry({ slug: `entry-${idx}`, kind: Kind.Class }))
        );

        const res = await GET(makeRequest('https://example.com/search?q=entry'));
        const results = await flatResults(res);
        expect(results).toHaveLength(24);
    });
});

describe('GET /search: instrumentation and rate limiting', () => {
    function makeIpRequest(url: string, ip: string): NextRequest {
        // justified: route reads nextUrl.searchParams and the cf-connecting-ip header only.
        return { nextUrl: new URL(url), headers: new Headers({ 'cf-connecting-ip': ip }) } as unknown as NextRequest;
    }

    it('sets a Server-Timing header on a search response', async () => {
        const res = await GET(makeRequest('https://example.com/search?q=Logger'));
        expect(res.headers.get('Server-Timing')).toMatch(/^search;dur=/);
    });

    it('returns 429 with an empty result set and an integer Retry-After once an ip exceeds its window', async () => {
        const ip = 'route-ratelimit-test';
        let limited: Response | null = null;
        // 200 sits above the default window limit, so the ip hits its cap before the loop ends
        for (let i = 0; i < 200 && !limited; i += 1) {
            const res = await GET(makeIpRequest('https://example.com/search?q=Logger', ip));
            if (res.status === 429) limited = res;
        }
        expect(limited).not.toBeNull();
        await expect(limited?.json()).resolves.toEqual({ results: [] });
        expect(limited?.headers.get('Retry-After')).toMatch(/^\d+$/);
    });
});
