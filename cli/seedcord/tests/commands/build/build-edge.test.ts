import { spawnSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { preview } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { copyEdgeBot, copyEdgeBotForTest, edgeBuildRunner, fakeDiscord, writeSigningEnv } from './edgeBot';

import type { BuildResult } from '#commands/build/BuildRunner';
import type { SignRequest } from './edgeBot';

const WRANGLER = join(import.meta.dirname, '../../../node_modules/wrangler/bin/wrangler.js');
const PING = '{"type":1}';

const HELLO_COMMAND = `import { BuilderComponent, RegisterCommand } from '@seedcord/http';

export class Hello extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('hello').setDescription('Says hello');
    }
}
RegisterCommand('global')(Hello);
`;

describe('seedcord build on an edge bot', () => {
    let projectDir: string;
    let remove: () => Promise<void>;
    let sign: SignRequest;
    let result: BuildResult;

    beforeAll(async () => {
        ({ projectDir, remove } = await copyEdgeBot());
        const signing = await writeSigningEnv(projectDir);
        sign = signing.sign;
        result = await edgeBuildRunner(fakeDiscord(signing.publicKey)).run(projectDir);
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
        const { status } = spawnSync(process.execPath, [WRANGLER, 'deploy', '--dry-run'], { cwd: projectDir });

        expect(status).toBe(0);
    }, 60_000);

    it('answers a PING signed with the key discord returned at build time', async () => {
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

        await expect(edgeBuildRunner().run(projectDir)).resolves.toBeDefined();
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

        await expect(edgeBuildRunner().run(projectDir)).resolves.toBeDefined();
    }, 120_000);

    it('builds an instance file with a top-level await', async () => {
        const projectDir = await copyEdgeBotForTest();
        await appendFile(join(projectDir, 'src/bot.ts'), '\nawait Promise.resolve();\n');

        await expect(edgeBuildRunner().run(projectDir)).resolves.toBeDefined();
    }, 120_000);

    it('leaves a constant the instance file exports out of the worker', async () => {
        const projectDir = await copyEdgeBotForTest();
        await appendFile(join(projectDir, 'src/bot.ts'), "\nexport const BOT_NAME = 'edge-bot';\n");

        await expect(edgeBuildRunner().run(projectDir)).resolves.toBeDefined();
    }, 120_000);

    it('throws CliEdgeCommandsNotDeployed with the file of a command discord has no id for', async () => {
        const projectDir = await copyEdgeBotForTest();
        await mkdir(join(projectDir, 'src/commands'));
        await writeFile(join(projectDir, 'src/commands/Hello.ts'), HELLO_COMMAND);
        const bot = await readFile(join(projectDir, 'src/bot.ts'), 'utf8');
        await writeFile(
            join(projectDir, 'src/bot.ts'),
            bot.replace('commands: { path: null }', "commands: { path: resolve(import.meta.dirname, './commands') }")
        );

        await expect(edgeBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeCommandsNotDeployed,
            message: expect.stringContaining('Hello.ts') as string
        });
    }, 120_000);

    it('throws CliEdgeRootHoldsConfig for a root that holds the seedcord config', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeFile(join(projectDir, 'seedcord.config.ts'), "export default { instance: './src/bot.ts' };\n");

        await expect(edgeBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeRootHoldsConfig
        });
    }, 120_000);

    it('throws CliEdgeRootHoldsConfig for a root above the seedcord config', async () => {
        const projectDir = await copyEdgeBotForTest();
        const config = { root: '..', instance: `./${basename(projectDir)}/src/bot.ts` };
        await writeFile(join(projectDir, 'seedcord.config.ts'), `export default ${JSON.stringify(config)};\n`);

        await expect(edgeBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeRootHoldsConfig
        });
    }, 120_000);
});
