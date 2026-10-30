import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { bindings, exports } from 'cf/config';
import { preview } from 'vite';
import { afterAll, beforeAll, describe, expect, it, onTestFinished, vi } from 'vite-plus/test';

import { BOT_ENVIRONMENT } from '#core/modules/botEnvironment';

import {
    copyEdgeBot,
    copyEdgeBotForTest,
    edgeBuildRunner,
    fakeDiscord,
    READ_IN_WORKERD,
    writeCloudflareConfig,
    writeSigningEnv
} from './edgeBot';

import type { BuildResult } from '#commands/build/BuildRunner';
import type { SignRequest } from './edgeBot';
import type { REST } from '@discordjs/rest';

const CF = join(import.meta.dirname, '../../../node_modules/cf/bin/cf');
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
        const configFile = join(projectDir, 'seedcord.config.ts');
        const configSource = await readFile(configFile, 'utf8');
        await writeFile(
            configFile,
            configSource.replace(
                'export default {',
                `export default {
    vitePlugins: () => [{ name: 'env-prefix', config: () => ({ envPrefix: ['VITE_', 'APP_'] }) }],`
            )
        );
        await writeCloudflareConfig(projectDir, {
            env: {
                VITE_GREETING: bindings.text('worker-binding'),
                APP_GREETING: bindings.text('worker-binding'),
                RUNTIME_GREETING: bindings.secret()
            }
        });
        await writeFile(join(projectDir, '.env'), 'VITE_GREETING=built\nAPP_GREETING=built-app\n');
        await appendFile(join(projectDir, '.dev.vars'), 'RUNTIME_GREETING=before\n');
        const bot = join(projectDir, 'src/bot.ts');
        await writeFile(
            bot,
            `import { Envapter } from 'envapt';
if (Envapter.get('VITE_GREETING') !== import.meta.env.VITE_GREETING) throw new Error('Vite sources disagree');
if (Envapter.get('APP_GREETING') !== import.meta.env.APP_GREETING) throw new Error('Custom prefix sources disagree');
if (Envapter.get('RUNTIME_GREETING') !== env.RUNTIME_GREETING) throw new Error('Runtime source is stale');
if (Envapter.environment !== 'production') throw new Error('Worker mode disagrees');
${await readFile(bot, 'utf8')}`
        );
        result = await edgeBuildRunner(fakeDiscord(signing.publicKey)).run(projectDir);
        await writeFile(
            join(projectDir, '.env'),
            'VITE_GREETING=changed-after-build\nAPP_GREETING=changed-after-build\n'
        );
        await appendFile(join(projectDir, '.dev.vars'), 'RUNTIME_GREETING=after\n');
    }, 120_000);

    afterAll(() => remove());

    it('reports the worker it bundled for the summary', () => {
        expect(result.bundle).toEqual({
            modules: 2,
            listedFiles: 1,
            bytes: expect.any(Number) as number,
            entry: expect.stringMatching(/index\.mjs$/) as string
        });
        expect(existsSync(result.bundle.entry)).toBe(true);
    });

    it('writes a worker that cf deploys from the project folder without building it again', () => {
        const { status, stderr } = spawnSync(process.execPath, [CF, 'deploy', '--prebuilt', '--dry-run'], {
            cwd: projectDir,
            encoding: 'utf8'
        });

        expect(status, stderr).toBe(0);
    }, 60_000);

    it('answers a PING signed with the key discord returned at build time', async () => {
        const server = await preview({
            root: projectDir,
            configFile: false,
            logLevel: 'silent',
            plugins: [cloudflare({ viteEnvironment: { name: BOT_ENVIRONMENT } })],
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

// vite preview answers a worker that threw with the error's text
async function postToPreview(projectDir: string, sign: SignRequest): Promise<string> {
    const server = await preview({
        root: projectDir,
        configFile: false,
        logLevel: 'silent',
        plugins: [cloudflare({ viteEnvironment: { name: BOT_ENVIRONMENT } })],
        preview: { port: 0 }
    });
    try {
        const response = await fetch(server.resolvedUrls?.local[0] ?? '', {
            method: 'POST',
            headers: await sign(PING),
            body: PING
        });
        return await response.text();
    } finally {
        await server.close();
    }
}

describe('a built edge worker', () => {
    it('reports a handler it fails to load by its path under the bot root', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeFile(
            join(projectDir, 'src/handlers/Broken.ts'),
            "if (navigator.userAgent === 'Cloudflare-Workers') throw new Error('Broken.ts threw in workerd');\n"
        );
        const signing = await writeSigningEnv(projectDir);
        await edgeBuildRunner(fakeDiscord(signing.publicKey)).run(projectDir);
        const body = await postToPreview(projectDir, signing.sign);

        expect(body).toContain('Could not import handlers/Broken.js');
        expect(body).not.toContain('../');
    }, 120_000);

    it('reads text and binary files from a listed folder byte for byte', async () => {
        const projectDir = await copyEdgeBotForTest();
        const binary = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
        await writeFile(join(projectDir, 'src/locales/dot.png'), binary);
        await writeFile(join(projectDir, 'src/locales/theme.css'), 'body { color: red; }\n');
        await writeFile(join(projectDir, 'src/handlers/Read.ts'), READ_IN_WORKERD);
        const signing = await writeSigningEnv(projectDir);
        await edgeBuildRunner(fakeDiscord(signing.publicKey)).run(projectDir);
        const body = await postToPreview(projectDir, signing.sign);

        const greeting = await readFile(join(projectDir, 'src/locales/greeting.txt'));
        expect(body).toContain(`dot.png=${binary.toString('hex')}`);
        expect(body).toContain(`greeting.txt=${greeting.toString('hex')}`);
        expect(body).toContain(`theme.css=${Buffer.from('body { color: red; }\n').toString('hex')}`);
    }, 120_000);

    it('reads a listed folder beside root', async () => {
        const projectDir = await copyEdgeBotForTest();
        await mkdir(join(projectDir, 'shared'));
        await writeFile(join(projectDir, 'shared/hello.txt'), 'hello\n');
        await writeFile(
            join(projectDir, 'seedcord.config.ts'),
            "export default { root: './src', instance: './bot.ts', files: ['../shared'] };\n"
        );
        await writeFile(join(projectDir, 'src/handlers/Read.ts'), READ_IN_WORKERD.replace('./locales', '../shared'));
        const signing = await writeSigningEnv(projectDir);
        await edgeBuildRunner(fakeDiscord(signing.publicKey)).run(projectDir);
        const body = await postToPreview(projectDir, signing.sign);

        expect(body).toContain(`read hello.txt=${Buffer.from('hello\n').toString('hex')}.`);
    }, 120_000);
});

describe('seedcord build on an edge bot with files it never loads', () => {
    it('builds a project with unimported files and extra exports from bot.ts', async () => {
        const projectDir = await copyEdgeBotForTest();
        await mkdir(join(projectDir, 'dist'));
        await writeFile(join(projectDir, 'dist/notes.txt'), 'not a build\n');
        await mkdir(join(projectDir, 'src/scripts'));
        await writeFile(join(projectDir, 'src/scripts/oneOff.ts'), 'setTimeout(() => undefined, 1);\n');
        await appendFile(
            join(projectDir, 'src/bot.ts'),
            "\nexport class Counter {}\nexport const BOT_NAME = 'edge-bot';\nawait Promise.resolve();\n"
        );
        await writeCloudflareConfig(projectDir, {
            env: { COUNTER: bindings.durableObject({ worker: 'edge-bot', exportName: 'Counter' }) },
            exports: { Counter: exports.durableObject({ storage: 'sqlite' }) }
        });

        await expect(edgeBuildRunner().run(projectDir)).resolves.toBeDefined();
    }, 120_000);

    it('throws CliEdgeCommandsNotDeployed with the file of a command discord has no id for', async () => {
        const projectDir = await copyEdgeBotForTest();
        await mkdir(join(projectDir, 'src/commands'));
        await writeFile(join(projectDir, 'src/commands/Hello.ts'), HELLO_COMMAND);
        const bot = await readFile(join(projectDir, 'src/bot.ts'), 'utf8');
        await writeFile(
            join(projectDir, 'src/bot.ts'),
            bot.replace('commands: { path: null }', "commands: { path: './commands' }")
        );

        await expect(edgeBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeCommandsNotDeployed,
            message: expect.stringContaining('Hello.ts') as string
        });
    }, 120_000);

    it('throws CliEdgeOnBun on bun before it reads anything from discord', async () => {
        const projectDir = await copyEdgeBotForTest();
        vi.stubGlobal('Bun', {});
        onTestFinished(() => {
            vi.unstubAllGlobals();
        });
        const reads: string[] = [];
        const discord = fakeDiscord();
        const recording: Pick<REST, 'get'> = {
            get: (route, options) => {
                reads.push(route);
                return discord.get(route, options);
            }
        };

        await expect(edgeBuildRunner(recording).run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeOnBun
        });
        expect(reads).toEqual([]);
    }, 120_000);

    it('throws CliConfigFieldUnused for a cloudflare.config.ts that sets entrypoint', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeCloudflareConfig(projectDir, { entrypoint: './src/bot.ts' });

        await expect(edgeBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliConfigFieldUnused,
            message: expect.stringContaining('cloudflare.config.ts') as string
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
        // assertNoHashPaths throws CliPathHasHash on this folder
        await mkdir(join(projectDir, 'a#b'));

        await expect(edgeBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeRootHoldsConfig
        });
    }, 120_000);
});
