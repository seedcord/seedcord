import { mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLogger, createServer } from 'vite';
import { describe, expect, it, onTestFinished } from 'vitest';

import { edgeViteConfig, serverViteConfig } from '#commands/dev/runtime/devServerConfig';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { holdViteHmrPort } from '#tests/viteHmrPort';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotLayout } from '@seedcord/utils/internal';
import type { InlineConfig } from 'vite';

function configAt(root: string): Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'files' | 'target'> {
    return {
        root: realPath(root),
        configFile: realPath(join(root, 'x.ts')),
        files: [],
        target: { kind: 'server', start: undefined, outDir: realPath(join(root, 'dist')) }
    };
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
        ['a server', (root: string): InlineConfig => serverViteConfig(configAt(root), layoutAt(root))],
        ['an edge', (root: string): InlineConfig => edgeViteConfig(layoutAt(root), root)]
    ])('opens no hmr websocket for %s bot while another process holds its port', async (_kind, config) => {
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
