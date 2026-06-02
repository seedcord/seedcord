import { beforeAll, describe, expect, it } from 'vitest';

import { IndexFetchError, PackageVersionNotFoundError, ProjectFetchError } from '@remote/errors';
import { IndexLoader } from '@remote/index-loader';
import { serializeProject } from '@remote/project-file';
import { VersionedDocsEngine } from '@remote/VersionedDocsEngine';

import { MOCK_PACKAGE_FULL_NAME } from '../utils/constants';
import { getMockPackage } from '../utils/test-helpers';

import type { IndexJson } from '@remote/index-json';
import type { Fetcher } from '@remote/index-loader';
import type { DocProjectFile } from '@remote/project-file';

const INDEX_URL = 'https://cdn.test/index.json';
const MOCK_FOLDER = 'mock-docs';

let projectFile: DocProjectFile;
let index: IndexJson;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
}

function makeEngine(fetcher: Fetcher): VersionedDocsEngine {
    return new VersionedDocsEngine(new IndexLoader(INDEX_URL, fetcher), fetcher);
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
                }
            }
        };
    });

    it('lists packages from the index without loading any project', async () => {
        const engine = makeEngine(fixtureFetcher());
        expect(await engine.listPackages()).toEqual([{ folder: MOCK_FOLDER, fullName: MOCK_PACKAGE_FULL_NAME }]);
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

    it('resolves an in-package reference by key', async () => {
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        const target = engine.getNodeBySlug(MOCK_PACKAGE_FULL_NAME, 'mock-function');
        expect(target).not.toBeNull();
        expect(engine.resolveReference(MOCK_PACKAGE_FULL_NAME, { name: target!.name, targetKey: target!.key })).toEqual(
            {
                packageName: MOCK_PACKAGE_FULL_NAME,
                slug: 'mock-function'
            }
        );
    });

    it('degrades a cross-package reference to a package-scoped URL target', async () => {
        const engine = makeEngine(fixtureFetcher());
        await engine.setVersion(MOCK_FOLDER, 'latest');

        expect(
            engine.resolveReference(MOCK_PACKAGE_FULL_NAME, {
                name: 'Logger',
                packageName: '@seedcord/services',
                qualifiedName: 'Logger#debug',
                targetKey: 'services!Logger#debug:member(1)'
            })
        ).toEqual({ packageName: '@seedcord/services', slug: 'logger/debug' });
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
