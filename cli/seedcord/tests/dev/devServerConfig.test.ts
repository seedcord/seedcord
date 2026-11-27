import { mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLogger, createServer } from 'vite';
import { describe, expect, it, onTestFinished } from 'vite-plus/test';

import { edgeViteConfig, serverViteConfig } from '#commands/dev/runtime/devServerConfig';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';
import { holdViteHmrPort } from '#tests/viteHmrPort';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotLayout } from '@seedcord/utils/internal';
import type { InlineConfig } from 'vite';

function configAt(root: string): ResolvedSeedcordConfig {
    return resolvedConfigOf(root, { root: realPath(root), configFile: realPath(join(root, 'x.ts')) });
}

function layoutAt(root: string): BotLayout {
    return new ProjectFiles(configAt(root)).layout;
}

function project(): string {
    const scratch = mkdtempDisposableSync(join(tmpdir(), 'seedcord-dev-config-'));
    onTestFinished(() => scratch.remove());
    writeFileSync(join(scratch.path, 'bot.ts'), 'export const bot = 1;\n');
    return scratch.path;
}

describe('dev vite config', () => {
    it.each([
        ['a server', (root: string): InlineConfig => serverViteConfig(configAt(root), layoutAt(root), new Server())],
        ['an edge', (root: string): InlineConfig => edgeViteConfig(layoutAt(root), root, configAt(root), new Server())]
    ])("doesn't open its own hmr port for %s bot while another process holds that port", async (_kind, config) => {
        await holdViteHmrPort();
        const root = project();
        const errors: string[] = [];
        const logger = createLogger('silent');
        logger.error = (message) => errors.push(message);

        const server = await createServer(mergeViteConfig(config(root), { customLogger: logger }));
        onTestFinished(() => server.close());
        await server.transformRequest('/bot.ts');

        expect(errors).toEqual([]);
    });
});
