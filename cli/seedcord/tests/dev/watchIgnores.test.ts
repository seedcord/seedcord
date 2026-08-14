import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createServer, mergeConfig } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

import viteConfig from '@commands/dev/runtime/vite.config';

import type { ViteDevServer } from 'vite';

const SETTLE_MS = 1200;
const WATCH_MS = 2000;

let server: ViteDevServer | undefined;

afterEach(async () => {
    await server?.close();
    server = undefined;
});

async function filesTouchedAfterWriting(paths: readonly string[], root: string): Promise<string[]> {
    const touched: string[] = [];

    server = await createServer(
        mergeConfig(viteConfig, {
            root,
            logLevel: 'error',
            plugins: [
                {
                    name: 'record',
                    hotUpdate: ({ file }: { file: string }) => {
                        touched.push(file.replace(root, ''));
                        return [];
                    }
                }
            ]
        })
    );

    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    for (const path of paths) appendFileSync(path, 'a line\n');
    await new Promise((resolve) => setTimeout(resolve, WATCH_MS));

    return touched;
}

describe('dev server watch ignores', () => {
    it('stays quiet while the bot writes its log file', async () => {
        const root = mkdtempSync(join(tmpdir(), 'seedcord-watch-'));
        mkdirSync(join(root, 'logs'), { recursive: true });
        writeFileSync(join(root, 'bot.ts'), 'export const bot = 1;\n');

        const touched = await filesTouchedAfterWriting([join(root, 'logs', 'combined.log')], root);

        expect(touched).toEqual([]);
    });
});
