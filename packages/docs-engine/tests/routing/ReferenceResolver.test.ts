import { describe, expect, it, vi } from 'vitest';

import type { CrossPackageEntity, NodeLookup, PackageRegistry } from '../../src/routing/lookup';
import type { EntityTone } from '../../src/tones';
import type { DocNode, DocPackageModel, DocReference } from '../../src/types';

// justified: stub kindName to echo the fixture's `kind` string so fixtures use kind names directly.
vi.mock('../../src/kinds', async () => {
    const actual = await vi.importActual<typeof import('../../src/kinds')>('../../src/kinds');
    return {
        ...actual,
        kindName: (kind: unknown): string => (typeof kind === 'string' ? kind : String(kind))
    };
});

const { orderedPackageCandidates } = await import('../../src/routing/resolve-helpers');
const { AnchorStrategy } = await import('../../src/routing/AnchorStrategy');
const { ReferenceResolver } = await import('../../src/routing/ReferenceResolver');

function makeNode(overrides: Partial<DocNode>): DocNode {
    const base: Partial<DocNode> = {
        id: 1,
        name: 'Stub',
        slug: 'stub',
        kind: 'class' as unknown as DocNode['kind'],
        kindLabel: 'Class',
        packageName: 'seedcord',
        sourcePackage: { name: 'seedcord', version: '1.0.0' },
        qualifiedName: 'Stub',
        path: ['Stub'],
        children: [],
        groups: [],
        signatures: [],
        sources: [],
        typeParameters: [],
        inheritance: {}
    };
    return { ...base, ...overrides } as DocNode;
}

interface FakeOptions {
    nodesByKey?: Map<string, DocNode>;
    nodesByGlobalSlug?: Map<string, DocNode>;
    nodesBySlug?: Map<string, DocNode>;
    nodesByQualifiedName?: Map<string, DocNode>;
    packageVersion?: string | null;
    loaded?: string[];
    known?: string[];
    // Per-package qName index that resolveWithinPackage reads.
    modelQNames?: Map<string, Map<string, DocNode>>;
    // fullName -> the index entry's version + entity-slug -> tone map, read by the cross-package gate.
    cross?: Record<string, { version: string; entities: Record<string, EntityTone> }>;
}

interface Fake {
    lookup: NodeLookup;
    registry: PackageRegistry;
    spies: {
        byKey: ReturnType<typeof vi.fn>;
        bySlug: ReturnType<typeof vi.fn>;
        byGlobalSlug: ReturnType<typeof vi.fn>;
        byQName: ReturnType<typeof vi.fn>;
    };
}

function makeFake(options: FakeOptions = {}): Fake {
    const byKeyMap = options.nodesByKey ?? new Map<string, DocNode>();
    const globalSlug = options.nodesByGlobalSlug ?? new Map<string, DocNode>();
    const localSlug = options.nodesBySlug ?? new Map<string, DocNode>();
    const qNameMap = options.nodesByQualifiedName ?? new Map<string, DocNode>();
    const version = 'packageVersion' in options ? options.packageVersion : '1.0.0';
    const loaded = options.loaded ?? ['seedcord'];
    const known = options.known ?? loaded;
    const modelQNames = options.modelQNames ?? new Map<string, Map<string, DocNode>>();

    const byKey = vi.fn((key: string) => byKeyMap.get(key) ?? null);
    const byGlobalSlug = vi.fn((_pkg: string, slug: string) => globalSlug.get(slug) ?? null);
    const bySlug = vi.fn((_pkg: string, slug: string) => localSlug.get(slug) ?? null);
    const byQName = vi.fn((_pkg: string, qname: string) => qNameMap.get(qname) ?? null);

    const lookup: NodeLookup = {
        getNodeByKey: (key) => byKey(key),
        getNodeBySlug: (pkg, slug) => bySlug(pkg, slug),
        getNodeByGlobalSlug: (pkg, slug) => byGlobalSlug(pkg, slug),
        getNodeByQualifiedName: (pkg, qname) => byQName(pkg, qname),
        getPackage: (pkg) => {
            if (version === null && !modelQNames.has(pkg)) return null;
            return {
                manifest: { name: pkg, version: version ?? '1.0.0' },
                indexes: { byQName: modelQNames.get(pkg) ?? new Map<string, DocNode>() }
            } as unknown as DocPackageModel;
        }
    };

    const cross = options.cross ?? {};
    const entityFromCross = (fullName: string, slug: string): CrossPackageEntity | null => {
        const pkg = cross[fullName];
        if (!pkg) return null;
        const segments = slug.split('/');
        const entitySlug = segments[0];
        if (!entitySlug) return null;
        const tone = pkg.entities[entitySlug];
        if (!tone) return null;
        const fragment = segments.length > 1 ? segments.at(-1) : undefined;
        return fragment
            ? { tone, version: pkg.version, entitySlug, fragment }
            : { tone, version: pkg.version, entitySlug };
    };

    const registry: PackageRegistry = {
        isKnownPackage: (name) => known.includes(name),
        candidatePackages: (current, hinted) => orderedPackageCandidates(current, hinted, loaded),
        crossPackageEntity: (fullName, slug) => entityFromCross(fullName, slug)
    };

    return { lookup, registry, spies: { byKey, bySlug, byGlobalSlug, byQName } };
}

function makeResolver(options: FakeOptions = {}): {
    resolver: InstanceType<typeof ReferenceResolver>;
    spies: Fake['spies'];
} {
    const fake = makeFake(options);
    const resolver = new ReferenceResolver(fake.lookup, fake.registry, new AnchorStrategy(fake.lookup));
    return { resolver, spies: fake.spies };
}

describe('ReferenceResolver.href', () => {
    it('returns null when the reference is null or undefined', () => {
        const { resolver } = makeResolver();
        expect(resolver.href('seedcord', null)).toBeNull();
        expect(resolver.href('seedcord', undefined as unknown as DocReference)).toBeNull();
    });

    it('short-circuits to the reference externalUrl without touching any lookup', () => {
        const { resolver, spies } = makeResolver();
        const ref: DocReference = { name: 'Whatever', externalUrl: 'https://example.com/api' };
        expect(resolver.href('seedcord', ref)).toBe('https://example.com/api');
        expect(spies.byKey).not.toHaveBeenCalled();
        expect(spies.byGlobalSlug).not.toHaveBeenCalled();
        expect(spies.byQName).not.toHaveBeenCalled();
    });

    it('builds an internal href for a top-level entity node resolved by key', () => {
        const node = makeNode({
            slug: 'mock-class',
            kind: 'class' as unknown as DocNode['kind'],
            qualifiedName: 'MockClass',
            sourcePackage: { name: 'seedcord', version: '2.0.0' }
        });
        const { resolver } = makeResolver({
            nodesByKey: new Map([['k', node]]),
            nodesByGlobalSlug: new Map([['mock-class', node]])
        });
        const ref: DocReference = { name: 'MockClass', targetKey: 'k' };
        expect(resolver.href('seedcord', ref)).toBe('/packages/seedcord/2.0.0/classes/mock-class');
    });

    it('resolves a reference within a loaded package by qualified name (resolveWithinPackage path)', () => {
        const node = makeNode({
            slug: 'mock-class',
            kind: 'class' as unknown as DocNode['kind'],
            qualifiedName: 'MockClass',
            sourcePackage: { name: 'seedcord', version: '2.0.0' }
        });
        const { resolver } = makeResolver({
            modelQNames: new Map([['seedcord', new Map([['MockClass', node]])]]),
            nodesByGlobalSlug: new Map([['mock-class', node]])
        });
        const ref: DocReference = { name: 'MockClass', qualifiedName: 'MockClass' };
        expect(resolver.href('seedcord', ref)).toBe('/packages/seedcord/2.0.0/classes/mock-class');
    });

    it('falls back to buildEntityHref with the package manifest version when the node is missing', () => {
        const node = makeNode({ slug: 'ghost' });
        const { resolver } = makeResolver({ nodesByKey: new Map([['k', node]]), packageVersion: '9.9.9' });
        const ref: DocReference = { name: 'Ghost', targetKey: 'k' };
        // node resolves by key (packageName seedcord, slug ghost) but href-render lookup misses -> version fallback.
        expect(resolver.href('seedcord', ref)).toBe('/packages/seedcord/9.9.9/ghost');
    });

    it('builds an anchored href for a method member node (member-anchor branch)', () => {
        const owner = makeNode({
            slug: 'MockClass',
            qualifiedName: 'MockClass',
            kind: 'class' as unknown as DocNode['kind']
        });
        const member = makeNode({
            slug: 'MockClass/doThing',
            qualifiedName: 'MockClass.doThing',
            kind: 'method' as unknown as DocNode['kind']
        });
        const { resolver } = makeResolver({
            nodesByKey: new Map([['k', member]]),
            nodesByGlobalSlug: new Map([
                ['MockClass', owner],
                ['MockClass/doThing', member]
            ])
        });
        const ref: DocReference = { name: 'doThing', targetKey: 'k' };
        expect(resolver.href('seedcord', ref)).toBe('/packages/seedcord/1.0.0/classes/MockClass#doThing');
    });

    it('points a parameter on a method at the owning method anchor', () => {
        const owner = makeNode({
            slug: 'MockClass',
            qualifiedName: 'MockClass',
            kind: 'class' as unknown as DocNode['kind']
        });
        const method = makeNode({
            slug: 'MockClass/doThing',
            qualifiedName: 'MockClass.doThing',
            kind: 'method' as unknown as DocNode['kind']
        });
        const param = makeNode({
            slug: 'MockClass/doThing/arg',
            qualifiedName: 'MockClass.doThing.arg',
            kind: 'parameter' as unknown as DocNode['kind']
        });
        const { resolver } = makeResolver({
            nodesByKey: new Map([['k', param]]),
            nodesByGlobalSlug: new Map([
                ['MockClass', owner],
                ['MockClass/doThing', method],
                ['MockClass/doThing/arg', param]
            ])
        });
        const ref: DocReference = { name: 'arg', targetKey: 'k' };
        expect(resolver.href('seedcord', ref)).toBe('/packages/seedcord/1.0.0/classes/MockClass#doThing');
    });

    it('points a parameter on a constructor at the #constructor anchor', () => {
        const owner = makeNode({
            slug: 'MockClass',
            qualifiedName: 'MockClass',
            kind: 'class' as unknown as DocNode['kind']
        });
        const ctor = makeNode({
            slug: 'MockClass/constructor',
            qualifiedName: 'MockClass.constructor',
            kind: 'constructor' as unknown as DocNode['kind']
        });
        const param = makeNode({
            slug: 'MockClass/constructor/options',
            qualifiedName: 'MockClass.constructor.options',
            kind: 'parameter' as unknown as DocNode['kind']
        });
        const { resolver } = makeResolver({
            nodesByKey: new Map([['k', param]]),
            nodesByGlobalSlug: new Map([
                ['MockClass', owner],
                ['MockClass/constructor', ctor],
                ['MockClass/constructor/options', param]
            ])
        });
        const ref: DocReference = { name: 'options', targetKey: 'k' };
        expect(resolver.href('seedcord', ref)).toBe('/packages/seedcord/1.0.0/classes/MockClass#constructor');
    });

    it('falls back to the owner node when no entity ancestor matches via slug walk (owner-node branch)', () => {
        const owner = makeNode({
            slug: 'MockClass',
            qualifiedName: 'MockClass',
            kind: 'class' as unknown as DocNode['kind'],
            sourcePackage: { name: 'seedcord', version: '3.1.4' }
        });
        const member = makeNode({
            slug: 'something/orphanMember',
            qualifiedName: 'MockClass.orphanMember',
            kind: 'property' as unknown as DocNode['kind']
        });
        const { resolver } = makeResolver({
            nodesByKey: new Map([['k', member]]),
            nodesByGlobalSlug: new Map([['something/orphanMember', member]]),
            nodesByQualifiedName: new Map([['MockClass', owner]])
        });
        const ref: DocReference = { name: 'orphanMember', targetKey: 'k' };
        expect(resolver.href('seedcord', ref)).toBe('/packages/seedcord/3.1.4/classes/MockClass');
    });

    it('returns /404 when the resolved member has no entity ancestor and no qualifiedName owner', () => {
        const member = makeNode({
            slug: 'a/b/c',
            qualifiedName: 'unrelated',
            kind: 'property' as unknown as DocNode['kind']
        });
        const { resolver } = makeResolver({
            nodesByKey: new Map([['k', member]]),
            nodesByGlobalSlug: new Map([['a/b/c', member]])
        });
        const ref: DocReference = { name: 'c', targetKey: 'k' };
        expect(resolver.href('seedcord', ref)).toBe('/404');
    });

    it('falls back to resolveExternalPackageUrl by name when nothing resolves (MDN builtin)', () => {
        const { resolver } = makeResolver();
        const ref: DocReference = { name: 'string' };
        expect(resolver.href('seedcord', ref)).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String'
        );
    });

    it('falls back to resolveExternalPackageUrl by packageName for an external library ref', () => {
        const { resolver } = makeResolver();
        const ref: DocReference = { name: 'Client', packageName: 'discord.js', qualifiedName: 'Client' };
        expect(resolver.href('seedcord', ref)).toBe('https://discord.js.org/docs');
    });

    it('falls back to qualifiedName lookup against the current package when prior branches miss', () => {
        const node = makeNode({
            slug: 'LateBound',
            qualifiedName: 'LateBound',
            kind: 'interface' as unknown as DocNode['kind'],
            sourcePackage: { name: 'seedcord', version: '1.0.0' }
        });
        const { resolver } = makeResolver({
            nodesByQualifiedName: new Map([['LateBound', node]]),
            nodesByGlobalSlug: new Map([['LateBound', node]])
        });
        const ref: DocReference = { name: 'TotallyUnknownLocalName', qualifiedName: 'LateBound' };
        expect(resolver.href('seedcord', ref)).toBe('/packages/seedcord/1.0.0/interfaces/LateBound');
    });

    it('returns null when nothing matches: no lookup hit, no external fallback, no qualifiedName hit', () => {
        const { resolver } = makeResolver();
        const ref: DocReference = { name: 'NoSuchSymbol', qualifiedName: 'NoSuchSymbol' };
        expect(resolver.href('seedcord', ref)).toBeNull();
    });
});

describe('ReferenceResolver.resolve', () => {
    const SERVICES_CROSS = {
        '@seedcord/services': { version: '0.5.0', entities: { logger: 'class' } }
    } as const;

    it('emits a cross-package internal target for a known-but-unloaded entity', () => {
        const { resolver } = makeResolver({
            loaded: ['seedcord'],
            known: ['seedcord', '@seedcord/services'],
            cross: SERVICES_CROSS
        });
        const ref: DocReference = { name: 'Logger', packageName: '@seedcord/services', qualifiedName: 'Logger#debug' };
        expect(resolver.resolve('seedcord', ref)).toEqual({
            kind: 'internal',
            packageName: '@seedcord/services',
            slug: 'logger/debug'
        });
    });

    it('gates a known-but-unverifiable slug (param/predicate) to unresolved', () => {
        const { resolver } = makeResolver({
            loaded: ['seedcord'],
            known: ['seedcord', '@seedcord/services'],
            cross: SERVICES_CROSS
        });
        // `Ghost` is not an entity in the services index, so it does not resolve.
        const ref: DocReference = { name: 'Ghost', packageName: '@seedcord/services', qualifiedName: 'Ghost' };
        expect(resolver.resolve('seedcord', ref)).toEqual({ kind: 'unresolved' });
    });

    it('falls through to unresolved when crossPackageUrlRef yields nothing (no qualifiedName)', () => {
        const { resolver } = makeResolver({ loaded: ['seedcord'], known: ['seedcord', '@seedcord/services'] });
        const ref: DocReference = { name: 'Logger', packageName: '@seedcord/services' };
        expect(resolver.resolve('seedcord', ref)).toEqual({ kind: 'unresolved' });
    });

    it('returns unresolved for an unknown (external) package', () => {
        const { resolver } = makeResolver({ loaded: ['seedcord'], known: ['seedcord'] });
        const ref: DocReference = { name: 'Client', packageName: 'discord.js', qualifiedName: 'Client' };
        expect(resolver.resolve('seedcord', ref)).toEqual({ kind: 'unresolved' });
    });
});

describe('ReferenceResolver.href cross-package', () => {
    const SERVICES_CROSS = {
        '@seedcord/services': { version: '0.5.0', entities: { logger: 'class' } }
    } as const;

    it('builds a 5-segment tone+version URL with a member fragment for an unloaded entity', () => {
        const { resolver } = makeResolver({
            loaded: ['seedcord'],
            known: ['seedcord', '@seedcord/services'],
            cross: SERVICES_CROSS
        });
        const ref: DocReference = { name: 'Logger', packageName: '@seedcord/services', qualifiedName: 'Logger#debug' };
        expect(resolver.href('seedcord', ref)).toBe('/packages/services/0.5.0/classes/logger#debug');
    });

    it('routes a known-package non-entity (EventEmitter) to its node.js docs, not a 404 link', () => {
        const { resolver } = makeResolver({
            loaded: ['seedcord'],
            known: ['seedcord', '@seedcord/services'],
            cross: SERVICES_CROSS
        });
        // EventEmitter is not an entity in the services index, so href falls through to the
        // external-link table instead of building a 404 internal link.
        const ref: DocReference = {
            name: 'EventEmitter',
            packageName: '@seedcord/services',
            qualifiedName: 'EventEmitter'
        };
        expect(resolver.href('seedcord', ref)).toBe('https://nodejs.org/api/events.html#class-eventemitter');
    });
});
