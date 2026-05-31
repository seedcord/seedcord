import { describe, expect, it, vi } from 'vitest';

import type { DocsEngine } from '../src/DocsEngine';
import type { DocNode, DocReference } from '../src/types';

// justified: stub kindName to echo the fixture's `kind` string so fixtures stay readable without real typedoc ReflectionKind values.
vi.mock('../src/kinds', async () => {
    const actual = await vi.importActual<typeof import('../src/kinds')>('../src/kinds');
    return {
        ...actual,
        kindName: (kind: unknown): string => (typeof kind === 'string' ? kind : String(kind))
    };
});

const { resolveReferenceHref } = await import('../src/routing/reference-resolver');

type EngineResolution = ReturnType<DocsEngine['resolveReference']>;

interface FakeEngineOptions {
    resolveReference?: (currentPackage: string, reference: DocReference | null) => EngineResolution;
    nodesByGlobalSlug?: Map<string, DocNode>;
    nodesBySlug?: Map<string, DocNode>;
    nodesByQualifiedName?: Map<string, DocNode>;
    packageVersion?: string | null;
}

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

function makeEngine(options: FakeEngineOptions = {}): DocsEngine {
    const globalSlug = options.nodesByGlobalSlug ?? new Map<string, DocNode>();
    const localSlug = options.nodesBySlug ?? new Map<string, DocNode>();
    const qNameMap = options.nodesByQualifiedName ?? new Map<string, DocNode>();
    const version = 'packageVersion' in options ? options.packageVersion : '1.0.0';

    const engine = {
        resolveReference: options.resolveReference ?? ((): EngineResolution => ({})),
        getNodeByGlobalSlug: (_pkg: string, slug: string) => globalSlug.get(slug) ?? null,
        getNodeBySlug: (_pkg: string, slug: string) => localSlug.get(slug) ?? null,
        getNodeByQualifiedName: (_pkg: string, qname: string) => qNameMap.get(qname) ?? null,
        getPackage: (_pkg: string) =>
            version === null
                ? null
                : ({ manifest: { name: 'seedcord', version } } as unknown as ReturnType<DocsEngine['getPackage']>)
    };

    return engine as unknown as DocsEngine;
}

describe('resolveReferenceHref', () => {
    it('returns null when the reference is null or undefined', () => {
        const engine = makeEngine();
        expect(resolveReferenceHref(null, { engine, currentPackage: 'seedcord' })).toBeNull();
        expect(resolveReferenceHref(undefined, { engine, currentPackage: 'seedcord' })).toBeNull();
    });

    it('short-circuits to the reference externalUrl when present on the reference itself', () => {
        const engine = makeEngine({
            resolveReference: () => {
                throw new Error('resolveReference should not be called when reference.externalUrl is set');
            }
        });
        const ref: DocReference = { name: 'Whatever', externalUrl: 'https://example.com/api' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe('https://example.com/api');
    });

    it('returns the externalUrl from the engine resolution when the engine resolves to an external link', () => {
        const engine = makeEngine({
            resolveReference: () => ({ externalUrl: 'https://discord.js.org/docs/foo' })
        });
        const ref: DocReference = { name: 'Client' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            'https://discord.js.org/docs/foo'
        );
    });

    it('builds an internal href for a top-level entity node resolved by the engine', () => {
        const node = makeNode({
            slug: 'mock-class',
            kind: 'class' as unknown as DocNode['kind'],
            qualifiedName: 'MockClass',
            sourcePackage: { name: 'seedcord', version: '2.0.0' }
        });
        const engine = makeEngine({
            resolveReference: () => ({ packageName: 'seedcord', slug: 'mock-class' }),
            nodesByGlobalSlug: new Map([['mock-class', node]])
        });
        const ref: DocReference = { name: 'MockClass', qualifiedName: 'MockClass' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            '/docs/packages/seedcord/2.0.0/classes/mock-class'
        );
    });

    it('falls back to buildEntityHref with the package manifest version when the node is missing', () => {
        const engine = makeEngine({
            resolveReference: () => ({ packageName: 'seedcord', slug: 'ghost' }),
            packageVersion: '9.9.9'
        });
        const ref: DocReference = { name: 'Ghost' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            '/docs/packages/seedcord/9.9.9/ghost'
        );
    });

    it('builds an anchored href for a method member node (member-anchor branch)', () => {
        const owner = makeNode({
            slug: 'MockClass',
            qualifiedName: 'MockClass',
            kind: 'class' as unknown as DocNode['kind'],
            sourcePackage: { name: 'seedcord', version: '1.0.0' }
        });
        const member = makeNode({
            slug: 'MockClass/doThing',
            qualifiedName: 'MockClass.doThing',
            kind: 'method' as unknown as DocNode['kind'],
            sourcePackage: { name: 'seedcord', version: '1.0.0' }
        });
        const engine = makeEngine({
            resolveReference: () => ({ packageName: 'seedcord', slug: 'MockClass/doThing' }),
            nodesByGlobalSlug: new Map([
                ['MockClass', owner],
                ['MockClass/doThing', member]
            ])
        });
        const ref: DocReference = { name: 'doThing' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            '/docs/packages/seedcord/1.0.0/classes/MockClass#doThing'
        );
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
        const engine = makeEngine({
            resolveReference: () => ({ packageName: 'seedcord', slug: 'MockClass/doThing/arg' }),
            nodesByGlobalSlug: new Map([
                ['MockClass', owner],
                ['MockClass/doThing', method],
                ['MockClass/doThing/arg', param]
            ])
        });
        const ref: DocReference = { name: 'arg' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            '/docs/packages/seedcord/1.0.0/classes/MockClass#doThing'
        );
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
        const engine = makeEngine({
            resolveReference: () => ({ packageName: 'seedcord', slug: 'MockClass/constructor/options' }),
            nodesByGlobalSlug: new Map([
                ['MockClass', owner],
                ['MockClass/constructor', ctor],
                ['MockClass/constructor/options', param]
            ])
        });
        const ref: DocReference = { name: 'options' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            '/docs/packages/seedcord/1.0.0/classes/MockClass#constructor'
        );
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
        const engine = makeEngine({
            resolveReference: () => ({ packageName: 'seedcord', slug: 'something/orphanMember' }),
            nodesByGlobalSlug: new Map([['something/orphanMember', member]]),
            nodesByQualifiedName: new Map([['MockClass', owner]])
        });
        const ref: DocReference = { name: 'orphanMember' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            '/docs/packages/seedcord/3.1.4/classes/MockClass'
        );
    });

    it('returns /docs/404 when the resolved member has no entity ancestor and no qualifiedName owner', () => {
        const member = makeNode({
            slug: 'a/b/c',
            qualifiedName: 'unrelated',
            kind: 'property' as unknown as DocNode['kind']
        });
        const engine = makeEngine({
            resolveReference: () => ({ packageName: 'seedcord', slug: 'a/b/c' }),
            nodesByGlobalSlug: new Map([['a/b/c', member]])
        });
        const ref: DocReference = { name: 'c' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe('/docs/404');
    });

    it('falls back to resolveExternalPackageUrl when the engine cannot resolve and the reference name is a known external', () => {
        const engine = makeEngine({ resolveReference: () => ({}) });
        const ref: DocReference = { name: 'string' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String'
        );
    });

    it('falls back to qualifiedName lookup against the current package when prior branches miss', () => {
        const node = makeNode({
            slug: 'LateBound',
            qualifiedName: 'LateBound',
            kind: 'interface' as unknown as DocNode['kind'],
            packageName: 'seedcord',
            sourcePackage: { name: 'seedcord', version: '1.0.0' }
        });
        const engine = makeEngine({
            resolveReference: () => ({}),
            nodesByQualifiedName: new Map([['LateBound', node]]),
            nodesByGlobalSlug: new Map([['LateBound', node]])
        });
        const ref: DocReference = { name: 'TotallyUnknownLocalName', qualifiedName: 'LateBound' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBe(
            '/docs/packages/seedcord/1.0.0/interfaces/LateBound'
        );
    });

    it('returns null when nothing matches: engine empty, no external fallback, no qualifiedName hit', () => {
        const engine = makeEngine({ resolveReference: () => ({}) });
        const ref: DocReference = { name: 'NoSuchSymbol', qualifiedName: 'NoSuchSymbol' };
        expect(resolveReferenceHref(ref, { engine, currentPackage: 'seedcord' })).toBeNull();
    });
});
