import { createServer as createHttpServer } from 'node:http';

import { SeedcordErrorCode } from '@seedcord/errors';
import { createServer } from 'vite';
import { describe, expect, it } from 'vite-plus/test';

import { serverViteConfig } from '#commands/dev/runtime/devServerConfig';
import { ClientPages } from '#core/modules/ClientPages';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';
import { tempProject } from '#tests/tempProject';

import type { Plugin } from 'vite';

const PAGE = { 'client/uptime/index.html': '<p>uptime</p>' };

function openVite(root: string, plugins: Plugin[] = []): Promise<unknown> {
    const config = resolvedConfigOf(root);
    const project = new ProjectFiles(config);
    return createServer(
        mergeViteConfig(serverViteConfig(config, project.layout, createHttpServer()), {
            logLevel: 'silent',
            plugins: [project.client.vitePlugin({ edge: false }), ...plugins],
            server: { watch: null }
        })
    );
}

describe('ClientPages', () => {
    it("doesn't count an index.html in the pages folder's own node_modules as a page", async () => {
        await using project = await tempProject({ 'client/node_modules/pkg/index.html': '<p>pkg</p>' });

        expect(new ClientPages(resolvedConfigOf(project.root)).hasPages).toBe(false);
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
