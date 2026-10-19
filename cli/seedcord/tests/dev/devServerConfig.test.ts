import { mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLogger, createServer } from 'vite';
import { describe, expect, it, onTestFinished } from 'vite-plus/test';

import { edgeViteConfig, serverViteConfig } from '#commands/dev/runtime/devServerConfig';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { holdViteHmrPort } from '#tests/viteHmrPort';

import type { InlineConfig } from 'vite';

function project(): string {
    const scratch = mkdtempDisposableSync(join(tmpdir(), 'seedcord-dev-config-'));
    onTestFinished(() => scratch.remove());
    writeFileSync(join(scratch.path, 'bot.ts'), 'export const bot = 1;\n');
    return scratch.path;
}

describe('dev vite config', () => {
    it.each([
        ['a server', (root: string): InlineConfig => serverViteConfig({ root, configFile: join(root, 'x.ts') }, root)],
        [
            'an edge',
            (root: string): InlineConfig => edgeViteConfig({ root, configFile: join(root, 'x.ts') }, root, root)
        ]
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
