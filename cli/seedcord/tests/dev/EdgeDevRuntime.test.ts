import { once } from 'node:events';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { EdgeDevRuntime } from '#commands/dev/runtime/EdgeDevRuntime';
import { toSeedcordInstance } from '#core/modules/importInstance';
import { quietSteps } from '#core/output/quietSteps';
import { copyEdgeBotForTest, writeSigningEnv } from '#tests/commands/build/edgeBot';
import { ED25519_KEY_BYTES, FAKE_TOKEN } from '#tests/commands/build/smoke';
import { silentLogger } from '#tests/silentLogger';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { DevEvent, DevEventHandler } from '#commands/dev/runtime/events';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { LogRecord } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';
import type { AddressInfo } from 'node:net';

function edgeConfig(projectDir: string): ResolvedSeedcordConfig {
    // justified: the runtime reads only these fields
    return {
        configFile: join(projectDir, 'seedcord.config.ts'),
        root: join(projectDir, 'src'),
        instance: join(projectDir, 'src/bot.ts'),
        target: { kind: 'edge', wranglerConfig: join(projectDir, 'wrangler.jsonc') },
        build: { outDir: join(projectDir, 'dist') }
    } as ResolvedSeedcordConfig;
}

const liveVars = { DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: 'ab'.repeat(ED25519_KEY_BYTES) };

const WAVE_COMMAND = `import { BuilderComponent, RegisterCommand } from '@seedcord/http';

@RegisterCommand('global')
export class Wave extends BuilderComponent<'command'> {
    constructor() {
        super('command');
        this.instance.setName('wave').setDescription('Waves back');
    }
}
`;

// discord sends user in a dm. the http builder reads app_permissions on every interaction
const WAVE_INTERACTION = JSON.stringify({
    type: 2,
    id: '1',
    application_id: '1',
    token: 'interaction-token',
    app_permissions: '0',
    user: { id: '1', username: 'tester' },
    data: { type: 1, name: 'wave' }
});

const waveHandler = (says: string): string => `import { SlashHandler, SlashRoute } from '@seedcord/http';

@SlashRoute('wave')
export class WaveHandler extends SlashHandler<'wave'> {
    public execute(): Promise<void> {
        console.log('${says}');
        return Promise.resolve();
    }
}
`;

interface FakeDiscord {
    api: string;
    deployedNames: string[][];
}

// answers the reads a dev startup makes and records every command PUT
async function fakeDiscordApi(): Promise<FakeDiscord> {
    const deployedNames: string[][] = [];
    const server = createHttpServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            response.writeHead(200, { 'content-type': 'application/json' });
            if (request.method !== 'PUT') {
                response.end(JSON.stringify({ username: 'fake', items: [] }));
                return;
            }
            // justified: the bulk-overwrite body is an array of command JSON
            const commands = JSON.parse(Buffer.concat(chunks).toString()) as { name: string }[];
            deployedNames.push(commands.map((command) => command.name));
            response.end(JSON.stringify(commands.map((command, index) => ({ ...command, id: String(index + 1) }))));
        });
    }).listen(0);
    await once(server, 'listening');
    onTestFinished(() => void server.close());
    // justified: address() is AddressInfo once a TCP server is listening
    const { port } = server.address() as AddressInfo;
    return { api: `http://localhost:${port}/api`, deployedNames };
}

async function editFile(path: string, edit: (text: string) => string): Promise<void> {
    await writeFile(path, edit(await readFile(path, 'utf8')));
}

async function freePort(): Promise<number> {
    await using probe = createNetServer().listen(0);
    await once(probe, 'listening');
    // justified: address() is AddressInfo once a TCP server is listening
    const { port } = probe.address() as AddressInfo;
    return port;
}

async function setDevPort(projectDir: string, port: number): Promise<void> {
    await editFile(join(projectDir, 'wrangler.jsonc'), (text) =>
        text.replace('"compatibility_date"', `"dev": { "port": ${String(port)} },\n    "compatibility_date"`)
    );
}

// wrangler reads .dev.vars beside the wrangler config into the worker's env
async function writeDevVars(projectDir: string, vars: Record<string, string>): Promise<void> {
    const lines = Object.entries(vars).map(([key, value]) => `${key}=${value}\n`);
    await writeFile(join(projectDir, '.dev.vars'), lines.join(''));
}

async function startedRuntime(
    projectDir: string,
    onEvent?: DevEventHandler
): Promise<{ runtime: EdgeDevRuntime; instance: SeedcordInstance }> {
    const config = edgeConfig(projectDir);
    const runtime = new EdgeDevRuntime({ kind: 'edge', wranglerConfig: join(projectDir, 'wrangler.jsonc') });
    onTestFinished(() => runtime.dispose());
    await runtime.start(onEvent ? { config, onEvent } : { config });
    const { module } = await runtime.loadEntry();
    return { runtime, instance: toSeedcordInstance(await resolveDefaultExport(module), config.instance) };
}

describe('EdgeDevRuntime', () => {
    it('starts the bot in workerd when the session asks', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const { runtime, instance } = await startedRuntime(projectDir);

        await expect(runtime.startBot(instance)).resolves.not.toThrow();
    }, 120_000);

    it("reports the worker's logs", async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const logs: LogRecord[] = [];
        const { runtime, instance } = await startedRuntime(projectDir, (event) => {
            if (event.type === 'log') logs.push(event.record);
        });

        await runtime.startBot(instance);

        expect(logs.map((record) => record.message)).toContain('Coordinated startup completed successfully');
    }, 120_000);

    it("reports a console.log from the bot's own code", async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        await appendFile(join(projectDir, 'src/bot.ts'), "\nconsole.log('counter ready');\n");
        const messages: string[] = [];
        const { runtime, instance } = await startedRuntime(projectDir, (event) => {
            if (event.type === 'log') messages.push(event.record.message);
        });

        await runtime.startBot(instance);

        expect(messages).toContainEqual(expect.stringContaining('counter ready'));
    }, 120_000);

    it.each(['.dev.vars', '.env', 'wrangler.jsonc'])(
        'reports a restart is required when %s changes, and keeps the bot answering',
        async (file) => {
            const projectDir = await copyEdgeBotForTest();
            await writeDevVars(projectDir, liveVars);
            const port = await freePort();
            await setDevPort(projectDir, port);
            const events: DevEvent[] = [];
            const { runtime, instance } = await startedRuntime(projectDir, (event) => events.push(event));
            await runtime.startBot(instance);

            await appendFile(join(projectDir, file), file === 'wrangler.jsonc' ? '\n' : 'EXTRA=1\n');

            await vi.waitFor(() => {
                expect(events).toContainEqual({ type: 'restart-required' });
            });
            const unsigned = await fetch(`http://localhost:${port}/`, { method: 'POST', body: '{}' });
            expect(unsigned.status).toBe(401);
        },
        120_000
    );

    it("listens on the wrangler config's dev.port and reports it", async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const port = await freePort();
        await setDevPort(projectDir, port);
        const events: DevEvent[] = [];
        const { runtime, instance } = await startedRuntime(projectDir, (event) => events.push(event));
        await runtime.startBot(instance);

        const unsigned = await fetch(`http://localhost:${port}/`, { method: 'POST', body: '{}' });

        expect(events).toContainEqual({ type: 'server-listening', port });
        // the bot answers an unsigned interaction with 401
        expect(unsigned.status).toBe(401);
    }, 120_000);

    it('throws CliEdgeDevPortInUse when something already listens on dev.port', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const port = await freePort();
        await setDevPort(projectDir, port);
        await using holder = createNetServer().listen(port);
        await once(holder, 'listening');

        await expect(startedRuntime(projectDir)).rejects.toHaveProperty('code', SeedcordErrorCode.CliEdgeDevPortInUse);
    }, 120_000);

    it("keeps the bot's source off the endpoint", async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const port = await freePort();
        await setDevPort(projectDir, port);
        await startedRuntime(projectDir);

        const source = await fetch(`http://localhost:${port}/src/bot.ts`);

        expect(source.status).toBe(405);
        expect(await source.text()).not.toContain('Seedcord');
    }, 120_000);

    it('runs the saved version of a handler in the worker', async () => {
        const projectDir = await copyEdgeBotForTest();
        const { publicKey, sign } = await writeSigningEnv(projectDir);
        await writeDevVars(projectDir, { DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: publicKey });
        const port = await freePort();
        await setDevPort(projectDir, port);
        const handler = join(projectDir, 'src/handlers/Wave.ts');
        await writeFile(handler, waveHandler('waved v1'));
        const messages: string[] = [];
        const { runtime, instance } = await startedRuntime(projectDir, (event) => {
            if (event.type === 'log') messages.push(event.record.message);
        });
        await runtime.startBot(instance);
        const wave = async (): Promise<void> => {
            const body = WAVE_INTERACTION;
            await fetch(`http://localhost:${port}/`, { method: 'POST', body, headers: await sign(body) });
        };

        await writeFile(handler, waveHandler('waved v2'));

        await vi.waitFor(
            async () => {
                await wave();
                expect(messages).toContainEqual(expect.stringContaining('waved v2'));
            },
            { timeout: 20_000, interval: 500 }
        );
    }, 120_000);

    it('prompts for a saved command and deploys it once the session says so', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const discord = await fakeDiscordApi();
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text
                .replace(
                    'bot: { interactions:',
                    `bot: { restOptions: { api: '${discord.api}' }, commands: { path: './commands' }, interactions:`
                )
                .replace(', commands: { path: null }', '')
        );
        await mkdir(join(projectDir, 'src/commands'));
        const command = join(projectDir, 'src/commands/Wave.ts');
        await writeFile(command, WAVE_COMMAND);
        const events: DevEvent[] = [];
        const { runtime, instance } = await startedRuntime(projectDir, (event) => events.push(event));
        await runtime.startBot(instance);

        await editFile(command, (text) => text.replace("setName('wave')", "setName('salute')"));
        await vi.waitFor(() => {
            expect(events).toContainEqual(expect.objectContaining({ type: 'command-update-prompt' }));
        });
        runtime.refreshCommands(true);

        await vi.waitFor(() => {
            expect(discord.deployedNames).toEqual([['wave'], ['salute']]);
        });
    }, 120_000);

    it('rejects with the error the worker failed to start with', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, { DISCORD_PUBLIC_KEY: 'ab'.repeat(ED25519_KEY_BYTES) });
        const { runtime, instance } = await startedRuntime(projectDir);

        await expect(runtime.startBot(instance)).rejects.toHaveProperty('code', SeedcordErrorCode.ConfigMissingEnv);
    }, 120_000);

    it('settles a start that is still running when the session stops', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const { runtime, instance } = await startedRuntime(projectDir);

        const starting = runtime.startBot(instance);
        await runtime.stopBot();

        await expect(starting).resolves.toBeUndefined();
    }, 120_000);

    it('starts a fresh worker for the next session after a stop', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        const first = await startedRuntime(projectDir);
        await first.runtime.startBot(first.instance);
        await first.runtime.stopBot();
        await first.runtime.dispose();

        const second = await startedRuntime(projectDir);

        await expect(second.runtime.startBot(second.instance)).resolves.not.toThrow();
    }, 120_000);

    it('gives codegen a node copy of the bot that scans its commands', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text.replace('commands: { path: null }', "commands: { path: './commands' }")
        );
        await mkdir(join(projectDir, 'src/commands'));
        await writeFile(join(projectDir, 'src/commands/Wave.ts'), WAVE_COMMAND);
        const { runtime, instance } = await startedRuntime(projectDir);
        const config = edgeConfig(projectDir);

        const { outputPath } = await CodegenRunner.create(quietSteps, silentLogger).writeFrom({
            config,
            instance,
            modules: runtime
        });

        await expect(readFile(outputPath, 'utf8')).resolves.toContain('wave');
    }, 120_000);

    it('gives codegen the saved version of a file a command imports', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text.replace('commands: { path: null }', "commands: { path: './commands' }")
        );
        await mkdir(join(projectDir, 'src/commands'));
        const names = join(projectDir, 'src/names.ts');
        await writeFile(names, "export const WAVE = 'wave';\n");
        await writeFile(
            join(projectDir, 'src/commands/Wave.ts'),
            `import { WAVE } from '../names';\n${WAVE_COMMAND.replace("setName('wave')", 'setName(WAVE)')}`
        );
        const { runtime, instance } = await startedRuntime(projectDir);
        const codegen = CodegenRunner.create(quietSteps, silentLogger);
        const bot = { config: edgeConfig(projectDir), instance, modules: runtime };
        await codegen.writeFrom(bot);

        await writeFile(names, "export const WAVE = 'salute';\n");

        await vi.waitFor(
            async () => {
                const { outputPath } = await codegen.writeFrom(bot);
                await expect(readFile(outputPath, 'utf8')).resolves.toContain('salute');
            },
            { timeout: 20_000, interval: 500 }
        );
    }, 120_000);

    it('exports the durable object classes bot.ts exports', async () => {
        const projectDir = await copyEdgeBotForTest();
        await writeDevVars(projectDir, liveVars);
        await appendFile(
            join(projectDir, 'src/bot.ts'),
            "\nimport { DurableObject } from 'cloudflare:workers';\nexport class Counter extends DurableObject {}\n"
        );
        await editFile(join(projectDir, 'wrangler.jsonc'), (text) =>
            text.replace(
                '"compatibility_date"',
                '"durable_objects": { "bindings": [{ "name": "COUNTER", "class_name": "Counter" }] },\n    "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Counter"] }],\n    "compatibility_date"'
            )
        );
        const { runtime, instance } = await startedRuntime(projectDir);

        await expect(runtime.startBot(instance)).resolves.not.toThrow();
    }, 120_000);
});
