import { beforeAll, describe, expect, it } from 'vitest';

import { IndexFetchError, PackageVersionNotFoundError, ProjectFetchError } from '#remote/errors';
import { IndexLoader } from '#remote/index-loader';
import { serializeProject } from '#remote/project-file';
import { VersionedDocsEngine } from '#remote/VersionedDocsEngine';

import { MOCK_PACKAGE_FULL_NAME } from '../utils/constants';
import { getMockPackage } from '../utils/test-helpers';

import type { IndexJson } from '#remote/index-json';
import type { Fetcher } from '#remote/index-loader';
import type { DocProjectFile } from '#remote/project-file';
import type { DocPackageModel } from '#src/types';

const INDEX_URL = 'https://cdn.test/index.json';
const MOCK_FOLDER = 'mock-docs';

let projectFile: DocProjectFile;
let index: IndexJson;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
}

// default to a fresh per-engine cache so tests stay isolated while the model-cache test shares one.
function makeEngine(fetcher: Fetcher, modelCache = new Map<string, DocPackageModel>()): VersionedDocsEngine {
    return new VersionedDocsEngine(new IndexLoader(INDEX_URL, fetcher, () => true), fetcher, modelCache);
}

function fixtureFetcher(): Fetcher {
    return (url) => {
        if (url === INDEX_URL) return Promise.resolve(jsonResponse(index));
        if (url.includes(`/${MOCK_FOLDER}/`)) return Promise.resolve(jsonResponse(projectFile));
        return Promise.resolve(new Response('not found', { status: 404 }));
    };
}

describe('VersionedDocsEngine', () => {
    beforeAll(async () => {
        projectFile = serializeProject(await getMockPackage());
        index = {
            schemaVersion: 1,
            updatedAt: '2026-06-02T00:00:00.000Z',
            pathTemplates: {
                stable: 'packages/{name}/releases/{version}/project.json',
                prerelease: 'packages/{name}/prerelease/{version}/project.json'
            },
            packages: {
                [MOCK_FOLDER]: {
                    fullName: MOCK_PACKAGE_FULL_NAME,
                    stable: { latest: '0.0.0', latestByMinor: { '0.0': '0.0.0' }, latestByMajor: {} },
                    prerelease: null
                },
                // In the index but never loaded: the known-but-unloaded cross-package case. The gate
                // reads its entity map to build a correct URL without loading it.
                logger: {
                    fullName: '@seedcord/logger',
                    stable: { latest: '0.0.0', latestByMinor: { '0.0': '0.0.0' }, latestByMajor: {} },
                    prerelease: null,
                    entities: { logger: 'class' }
                },
                // Known but declares no entities here: a ref mis-attributed to it re-homes elsewhere.
                types: {
                    fullName: '@seedcord/types',
                    stable: { latest: '0.0.0', latestByMinor: { '0.0': '0.0.0' }, latestByMajor: {} },
                    prerelease: null,
                    entities: {}
                }
            }
        };
    });

    it('lists packages from the index without loading any project', async () => {
        const engine = makeEngine(fixtureFetcher());
        const packages = await engine.listPackages();
        expect(packages).toContainEqual({ folder: MOCK_FOLDER, fullName: MOCK_PACKAGE_FULL_NAME });
        expect(packages).toContainEqual({ folder: 'logger', fullName: '@seedcord/logger' });
        expect(engine.loadedPackages()).toEqual([]);
    });

    it('setVersion loads the project and exposes its entities', async () => {
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        expect(engine.activeVersion(MOCK_PACKAGE_FULL_NAME)).toBe('0.0.0');
        expect(engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-class')?.name).toBe('MockClass');
        expect(engine.listPackageEntities(MOCK_PACKAGE_FULL_NAME)?.classes).toContain('mock-class');
        expect(engine.search('MockClass', MOCK_PACKAGE_FULL_NAME).length).toBeGreaterThan(0);
    });

    it('deserializes a package once per version across engines sharing a model cache', async () => {
        const cache = new Map<string, DocPackageModel>();
        const fetched: string[] = [];
        const counting: Fetcher = (url) => {
            fetched.push(url);
            return fixtureFetcher()(url);
        };

        const first = makeEngine(counting, cache);
        await first.setVersion(MOCK_FOLDER, 'latest');
        const second = makeEngine(counting, cache);
        await second.setVersion(MOCK_FOLDER, 'latest');

        const projectFetches = fetched.filter((url) => url.includes(`/${MOCK_FOLDER}/`)).length;
        expect(projectFetches).toBe(1);
        expect(second.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-class')?.name).toBe('MockClass');
        expect(second.search('MockClass', MOCK_PACKAGE_FULL_NAME).length).toBeGreaterThan(0);
    });

    it('resolves an in-package reference by key', async () => {
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        const target = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-function');
        expect(target).not.toBeNull();
        expect(
            engine.resolver().resolve(MOCK_PACKAGE_FULL_NAME, { name: target!.name, targetKey: target!.key })
        ).toEqual({
            kind: 'internal',
            packageName: MOCK_PACKAGE_FULL_NAME,
            slug: 'mock-function'
        });
    });

    it('exposes loaded nodes by global slug and qualified name', async () => {
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        const node = engine.getNodeByGlobalSlug(MOCK_PACKAGE_FULL_NAME, 'mock-class');
        expect(node?.name).toBe('MockClass');
        expect(node).not.toBeNull();
        if (node) {
            expect(engine.getNodeByQualifiedName(MOCK_PACKAGE_FULL_NAME, node.qualifiedName)?.name).toBe('MockClass');
        }

        expect(engine.getNodeByGlobalSlug('@seedcord/logger', 'logger')).toBeNull();
        expect(engine.getNodeByQualifiedName(MOCK_PACKAGE_FULL_NAME, 'DoesNotExist')).toBeNull();
    });

    it('resolves a known-but-unloaded cross-package entity to a tone+version URL', async () => {
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        const ref = {
            name: 'Logger',
            packageName: '@seedcord/logger',
            qualifiedName: 'Logger#debug',
            targetKey: 'logger!Logger#debug:member(1)'
        };
        expect(engine.resolver().resolve(MOCK_PACKAGE_FULL_NAME, ref)).toEqual({
            kind: 'internal',
            packageName: '@seedcord/logger',
            slug: 'logger/debug'
        });
        expect(engine.resolver().href(MOCK_PACKAGE_FULL_NAME, ref)).toBe('/packages/logger/0.0.0/classes/logger#debug');
    });

    it('points a cross-package parameter ref at its owning member anchor, not the parameter', async () => {
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        // `Logger#debug.arg` -> slug `logger/debug/arg`; the fragment must be the member `debug`,
        // matching AnchorStrategy.buildParameterAnchor for loaded packages (not the param `arg`).
        const ref = { name: 'arg', packageName: '@seedcord/logger', qualifiedName: 'Logger#debug.arg' };
        expect(engine.resolver().resolve(MOCK_PACKAGE_FULL_NAME, ref)).toEqual({
            kind: 'internal',
            packageName: '@seedcord/logger',
            slug: 'logger/debug/arg'
        });
        expect(engine.resolver().href(MOCK_PACKAGE_FULL_NAME, ref)).toBe('/packages/logger/0.0.0/classes/logger#debug');
    });

    it('gates a known-but-unloaded non-entity reference to unresolved', async () => {
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        // `Ghost` is attributed to logger but absent from its entity map, so it does not resolve.
        expect(
            engine.resolver().resolve(MOCK_PACKAGE_FULL_NAME, {
                name: 'Ghost',
                packageName: '@seedcord/logger',
                qualifiedName: 'Ghost'
            })
        ).toEqual({ kind: 'unresolved' });
    });

    it('returns an unresolved target for an external package absent from the index', async () => {
        // discord.js has no docs page; href() must fall through to the external-URL table instead of
        // building a 404 internal /packages/discord.js/... link.
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        expect(
            engine.resolver().resolve(MOCK_PACKAGE_FULL_NAME, {
                name: 'Client',
                packageName: 'discord.js',
                qualifiedName: 'Client'
            })
        ).toEqual({ kind: 'unresolved' });
    });

    it('throws PackageVersionNotFoundError for an unknown package or version', async () => {
        const engine = makeEngine(fixtureFetcher());
        await expect(engine.setVersion('nonexistent', 'latest')).rejects.toBeInstanceOf(PackageVersionNotFoundError);
        await expect(engine.setVersion(MOCK_FOLDER, '9.9.9')).rejects.toBeInstanceOf(PackageVersionNotFoundError);
    });

    it('throws IndexFetchError / ProjectFetchError on transport failures', async () => {
        const badIndex = makeEngine(() => Promise.resolve(new Response('down', { status: 500 })));
        await expect(badIndex.setVersion(MOCK_FOLDER, 'latest')).rejects.toBeInstanceOf(IndexFetchError);

        const badProject = makeEngine((url) =>
            Promise.resolve(url === INDEX_URL ? jsonResponse(index) : new Response('missing', { status: 404 }))
        );
        await expect(badProject.setVersion(MOCK_FOLDER, 'latest')).rejects.toBeInstanceOf(ProjectFetchError);
    });
});
