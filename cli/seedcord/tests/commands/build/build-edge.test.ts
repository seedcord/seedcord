import { spawnSync } from 'node:child_process';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { preview } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BuildRunner } from '#commands/build/BuildRunner';
import { quietSteps } from '#core/output/quietSteps';

import { copyEdgeBot, copyEdgeBotForTest, writeSigningEnv } from './edgeBot';

import type { BuildResult } from '#commands/build/BuildRunner';
import type { SignRequest } from './edgeBot';

const WRANGLER = join(import.meta.dirname, '../../../node_modules/wrangler/bin/wrangler.js');
const PING = '{"type":1}';

describe('seedcord build on an edge bot', () => {
    let projectDir: string;
    let remove: () => Promise<void>;
    let sign: SignRequest;
    let result: BuildResult;

    beforeAll(async () => {
        ({ projectDir, remove } = await copyEdgeBot());
        sign = await writeSigningEnv(projectDir);
        result = await BuildRunner.create(quietSteps).run(projectDir);
    }, 120_000);

    afterAll(() => remove());

    it('reports the worker it bundled for the summary', () => {
        expect(result.bundle).toEqual({
            modules: 2,
            textFiles: 1,
            bytes: expect.any(Number) as number,
            entry: join(projectDir, 'dist/index.mjs')
        });
    });

    it('writes a worker that wrangler deploys from the project folder', () => {
        const { status, stdout, stderr } = spawnSync(process.execPath, [WRANGLER, 'deploy', '--dry-run'], {
            cwd: projectDir,
            encoding: 'utf8'
        });

        expect(stdout + stderr).toContain('Using redirected Wrangler configuration');
        expect(status).toBe(0);
    }, 60_000);

    it('answers a signed PING once it loads its handlers from the built files', async () => {
        const server = await preview({
            root: projectDir,
            configFile: false,
            logLevel: 'silent',
            plugins: [
                cloudflare({ configPath: join(projectDir, 'wrangler.jsonc'), viteEnvironment: { name: 'worker' } })
            ],
            environments: { worker: { build: { outDir: join(projectDir, 'dist') } } },
            preview: { port: 0 }
        });
        try {
            const response = await fetch(server.resolvedUrls?.local[0] ?? '', {
                method: 'POST',
                headers: await sign(PING),
                body: PING
            });

            expect(response.status).toBe(200);
            await expect(response.json()).resolves.toEqual({ type: 1 });
        } finally {
            await server.close();
        }
    }, 60_000);
});

describe('seedcord build on an edge bot with files it never loads', () => {
    it('builds a file under root that sets a timer at load, since nothing imports it', async () => {
        const projectDir = await copyEdgeBotForTest();
        await mkdir(join(projectDir, 'src/scripts'));
        await writeFile(join(projectDir, 'src/scripts/oneOff.ts'), 'setTimeout(() => undefined, 1);\n');

        await expect(BuildRunner.create(quietSteps).run(projectDir)).resolves.toBeDefined();
    }, 120_000);

    it('passes a named export of the instance file through to the worker', async () => {
        const projectDir = await copyEdgeBotForTest();
        await appendFile(join(projectDir, 'src/bot.ts'), '\nexport class Counter {}\n');
        const wrangler = {
            name: 'edge-bot',
            compatibility_date: '2026-08-04',
            durable_objects: { bindings: [{ name: 'COUNTER', class_name: 'Counter' }] },
            migrations: [{ tag: 'v1', new_sqlite_classes: ['Counter'] }]
        };
        await writeFile(join(projectDir, 'wrangler.jsonc'), JSON.stringify(wrangler));

        await expect(BuildRunner.create(quietSteps).run(projectDir)).resolves.toBeDefined();
    }, 120_000);

    it('throws CliEdgeRootIsConfigFolder for a root that holds the seedcord config', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeFile(join(projectDir, 'seedcord.config.ts'), "export default { instance: './src/bot.ts' };\n");

        await expect(BuildRunner.create(quietSteps).run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeRootIsConfigFolder
        });
    }, 120_000);

    it('throws CliEdgeRootIsConfigFolder for a root above the seedcord config', async () => {
        const projectDir = await copyEdgeBotForTest();
        const config = { root: '..', instance: `./${basename(projectDir)}/src/bot.ts` };
        await writeFile(join(projectDir, 'seedcord.config.ts'), `export default ${JSON.stringify(config)};\n`);

        await expect(BuildRunner.create(quietSteps).run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeRootIsConfigFolder
        });
    }, 120_000);
});
