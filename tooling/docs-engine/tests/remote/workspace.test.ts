import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { workspaceIndexLoader } from '#remote/workspace';

import type { IndexJson } from '#remote/index-json';

const INDEX: IndexJson = {
    schemaVersion: 1,
    updatedAt: '2026-10-02T00:00:00.000Z',
    pathTemplates: { stable: '{name}/{version}', prerelease: '{name}/next/{version}' },
    packages: {
        core: {
            fullName: '@seedcord/core',
            stable: { latest: '0.9.2', latestByMinor: { '0.9': '0.9.2' }, latestByMajor: { '0': '0.9.2' } },
            prerelease: null
        }
    }
};

const originalIndexUrl = process.env.SEEDCORD_DOCS_INDEX_URL;
let repo: string;
let fetchSpy: ReturnType<typeof vi.fn>;

async function writeLocalIndex(): Promise<void> {
    await mkdir(path.join(repo, 'generated/artifacts'), { recursive: true });
    await writeFile(path.join(repo, 'generated/artifacts/index.json'), JSON.stringify(INDEX));
}

describe('the workspace index', () => {
    beforeEach(async () => {
        delete process.env.SEEDCORD_DOCS_INDEX_URL;
        repo = await mkdtemp(path.join(tmpdir(), 'docs-workspace-'));
        await mkdir(path.join(repo, 'apps/site'), { recursive: true });
        vi.spyOn(process, 'cwd').mockReturnValue(path.join(repo, 'apps/site'));
        fetchSpy = vi.fn(() => Promise.resolve(new Response(JSON.stringify(INDEX))));
        vi.stubGlobal('fetch', fetchSpy);
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        if (originalIndexUrl === undefined) delete process.env.SEEDCORD_DOCS_INDEX_URL;
        else process.env.SEEDCORD_DOCS_INDEX_URL = originalIndexUrl;
        await rm(repo, { recursive: true, force: true });
    });

    it('reads the index pnpm docs:local wrote', async () => {
        await writeLocalIndex();

        const index = await workspaceIndexLoader().load();

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(index.packages.core?.fullName).toBe('@seedcord/core');
    });

    it('fetches the published index when no local one exists', async () => {
        await workspaceIndexLoader().load();

        expect(fetchSpy).toHaveBeenCalledWith('https://cdn.seedcord.org/index.json');
    });

    it('fetches the url in SEEDCORD_DOCS_INDEX_URL over a local index', async () => {
        await writeLocalIndex();
        process.env.SEEDCORD_DOCS_INDEX_URL = 'https://cdn.test/index.json';

        await workspaceIndexLoader().load();

        expect(fetchSpy).toHaveBeenCalledWith('https://cdn.test/index.json');
    });
});
