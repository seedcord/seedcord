import { IndexLoader, VersionedDocsEngine } from '@seedcord/docs-engine';
import { DocKind, slugifySegment } from '@seedcord/docs-engine/client';
import { RuntimeBuild } from '@seedcord/docs-generator/runtime-build';

import type { DocNode, DocPackageModel, DocProjectFile, IndexJson } from '@seedcord/docs-engine';

const INDEX_URL = 'https://cdn.test/index.json';

const FLAGS: DocNode['flags'] = {
    access: null,
    accessor: null,
    isStatic: false,
    isAbstract: false,
    isConst: false,
    isReadonly: false,
    isOptional: false,
    isAsync: false,
    isDeprecated: false,
    isInherited: false,
    isDecorator: false,
    isInternal: false,
    isExternal: false,
    isOverwriting: false
};

interface NodeOptions {
    kind: number;
    children?: DocNode[];
    isExported?: boolean;
    condition?: string;
}

export interface FixtureVersion {
    version: string;
    readme?: string;
    nodes: (pkg: { name: string; version: string }) => DocNode[];
}

let nextId = 0;

export function docNode(pkg: { name: string; version: string }, name: string, options: NodeOptions): DocNode {
    nextId += 1;
    return {
        id: nextId,
        key: `${pkg.name}!${name}`,
        packageName: pkg.name,
        sourcePackage: pkg,
        name,
        path: [name],
        qualifiedName: name,
        slug: slugifySegment(new RuntimeBuild(options.condition).withCondition(name)),
        kind: options.kind,
        kindLabel: '',
        isExported: options.isExported ?? true,
        flags: FLAGS,
        typeParameters: [],
        signatures: [],
        children: options.children ?? [],
        groups: [],
        sources: [],
        inheritance: {},
        ...(options.condition && { condition: options.condition })
    };
}

function projectFile(fullName: string, { version, readme, nodes }: FixtureVersion): DocProjectFile {
    const pkg = { name: fullName, version };
    return {
        schemaVersion: 1,
        package: pkg,
        // a real project file roots every package at the empty slug
        root: { ...docNode(pkg, fullName, { kind: DocKind.Project, children: nodes(pkg) }), slug: '' },
        ...(readme !== undefined && { readme })
    };
}

// one package published at each of the given versions, the first one the latest
export function fixtureEngine(
    folder: string,
    fullName: string,
    versions: readonly FixtureVersion[]
): VersionedDocsEngine {
    const latest = versions[0]?.version ?? '0.0.0';
    const latestByMinor = Object.fromEntries(
        versions.map(({ version }) => [version.split('.').slice(0, 2).join('.'), version])
    );
    const index: IndexJson = {
        schemaVersion: 1,
        updatedAt: '2026-10-02T00:00:00.000Z',
        pathTemplates: { stable: '{name}/{version}/project.json', prerelease: '{name}/next/{version}/project.json' },
        packages: {
            [folder]: { fullName, stable: { latest, latestByMinor, latestByMajor: { '0': latest } }, prerelease: null }
        }
    };

    const fetcher = (url: string): Promise<Response> => {
        if (url === INDEX_URL) return Promise.resolve(Response.json(index));
        const fixture = versions.find(({ version }) => url.endsWith(`/${folder}/${version}/project.json`));
        return Promise.resolve(
            fixture ? Response.json(projectFile(fullName, fixture)) : new Response('not found', { status: 404 })
        );
    };

    return new VersionedDocsEngine(
        new IndexLoader(INDEX_URL, fetcher, () => true),
        fetcher,
        new Map<string, DocPackageModel>()
    );
}
