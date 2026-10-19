import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { bindings, exports } from 'cf/config';
import { preview } from 'vite';
import { afterAll, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';

import { BOT_ENVIRONMENT } from '#core/modules/botEnvironment';

import {
    copyEdgeBot,
    copyEdgeBotForTest,
    edgeBuildRunner,
    fakeDiscord,
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
        result = await edgeBuildRunner(fakeDiscord(signing.publicKey)).run(projectDir);
    }, 120_000);

    afterAll(() => remove());

    it('reports the worker it bundled for the summary', () => {
        expect(result.bundle).toEqual({
            modules: 2,
            textFiles: 1,
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

describe('a built edge worker', () => {
    it('reports a handler it fails to load by its path under the bot root', async () => {
        const projectDir = await copyEdgeBotForTest();
        // node's build step loads the handler too, so only workerd throws
        await writeFile(
            join(projectDir, 'src/handlers/Broken.ts'),
            "if (navigator.userAgent === 'Cloudflare-Workers') throw new Error('Broken.ts threw in workerd');\n"
        );
        const signing = await writeSigningEnv(projectDir);
        await edgeBuildRunner(fakeDiscord(signing.publicKey)).run(projectDir);
        const server = await preview({
            root: projectDir,
            configFile: false,
            logLevel: 'silent',
            plugins: [cloudflare({ viteEnvironment: { name: BOT_ENVIRONMENT } })],
            preview: { port: 0 }
        });
        let body: string;
        try {
            // vite preview answers a worker that threw with the error's text
            const response = await fetch(server.resolvedUrls?.local[0] ?? '', {
                method: 'POST',
                headers: await signing.sign(PING),
                body: PING
            });
            body = await response.text();
        } finally {
            await server.close();
        }

        expect(body).toContain('Could not import handlers/Broken.js');
        expect(body).not.toContain('../');
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

        await expect(edgeBuildRunner().run(projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliEdgeRootHoldsConfig
        });
    }, 120_000);
});
