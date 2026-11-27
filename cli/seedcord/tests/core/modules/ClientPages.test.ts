import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { createServer } from 'vite';
import { describe, expect, it } from 'vite-plus/test';

import { ClientPages } from '#core/modules/ClientPages';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';
import { tempProject } from '#tests/tempProject';

import type { Plugin } from 'vite';

const PAGE = { 'client/uptime/index.html': '<p>uptime</p>' };

function openVite(root: string, plugins: Plugin[] = []): Promise<unknown> {
    return createServer({
        root,
        configFile: false,
        logLevel: 'silent',
        appType: 'custom',
        plugins: [new ClientPages(resolvedConfigOf(root)).vitePlugin({ edge: false }), ...plugins],
        server: { middlewareMode: true, watch: null }
    });
}

describe('ClientPages', () => {
    it("finds each index.html in the pages folder and skips the folder's own node_modules", async () => {
        await using project = await tempProject({ ...PAGE, 'client/node_modules/pkg/index.html': '<p>pkg</p>' });

        const { pages } = new ClientPages(resolvedConfigOf(project.root));

        expect(pages).toEqual([join(project.root, 'client/uptime/index.html')]);
    });

    it('throws CliViteBaseUnsupported when a vite plugin moves the pages under a base', async () => {
        await using project = await tempProject(PAGE);

        const opening = openVite(project.root, [{ name: 'base', config: () => ({ base: '/app/' }) }]);

        await expect(opening).rejects.toHaveProperty('code', SeedcordErrorCode.CliViteBaseUnsupported);
    });

    it.each([
        ['public/ has an assets folder', { 'public/assets/logo.svg': '<svg/>' }],
        ['a page sits under assets/', { 'client/assets/index.html': '<p>assets</p>' }]
    ])('throws CliAssetsPathTaken when %s', async (_case, files) => {
        await using project = await tempProject({ ...PAGE, ...files });

        await expect(openVite(project.root)).rejects.toHaveProperty('code', SeedcordErrorCode.CliAssetsPathTaken);
    });
});
