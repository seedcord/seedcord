import { once } from 'node:events';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeDefaults } from '@seedcord/logger/node';
import { Envapter, Environment } from 'envapt';
import { onTestFinished } from 'vitest';

import { EdgeDevRuntime } from '#commands/dev/runtime/EdgeDevRuntime';
import { toSeedcordInstance } from '#core/modules/importInstance';
import { copyEdgeBotForTest } from '#tests/commands/build/edgeBot';
import { ED25519_KEY_BYTES, FAKE_TOKEN } from '#tests/commands/build/smoke';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { DevEventHandler } from '#commands/dev/runtime/events';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { LogRecord } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';
import type { AddressInfo } from 'node:net';

export function edgeConfig(projectDir: string): ResolvedSeedcordConfig {
    // justified: the runtime reads only these fields
    return {
        configFile: join(projectDir, 'seedcord.config.ts'),
        root: join(projectDir, 'src'),
        instance: join(projectDir, 'src/bot.ts'),
        target: { kind: 'edge', wranglerConfig: join(projectDir, 'wrangler.jsonc') },
        build: { outDir: join(projectDir, 'dist') }
    } as ResolvedSeedcordConfig;
}

export const liveVars = { DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: 'ab'.repeat(ED25519_KEY_BYTES) };

export const WAVE_COMMAND = `import { BuilderComponent, RegisterCommand } from '@seedcord/http';

@RegisterCommand('global')
export class Wave extends BuilderComponent<'command'> {
    constructor() {
        super('command');
        this.instance.setName('wave').setDescription('Waves back');
    }
}
`;

// discord sends user in a dm. the http builder reads app_permissions on every interaction
export const WAVE_INTERACTION = JSON.stringify({
    type: 2,
    id: '1',
    application_id: '1',
    token: 'interaction-token',
    app_permissions: '0',
    user: { id: '1', username: 'tester' },
    data: { type: 1, name: 'wave' }
});

export const waveHandler = (says: string): string => `import { SlashHandler, SlashRoute } from '@seedcord/http';

@SlashRoute('wave')
export class WaveHandler extends SlashHandler<'wave'> {
    public execute(): Promise<void> {
        console.log('${says}');
        return Promise.resolve();
    }
}
`;

const OK = 200;

interface FakeDiscord {
    api: string;
    deployedNames: string[][];
}

// answers the reads a dev startup makes and records every command PUT
export async function fakeDiscordApi(): Promise<FakeDiscord> {
    const deployedNames: string[][] = [];
    const server = createHttpServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            response.writeHead(OK, { 'content-type': 'application/json' });
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

export async function editFile(path: string, edit: (text: string) => string): Promise<void> {
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
export async function writeDevVars(projectDir: string, vars: Record<string, string>): Promise<void> {
    const lines = Object.entries(vars).map(([key, value]) => `${key}=${value}\n`);
    await writeFile(join(projectDir, '.dev.vars'), lines.join(''));
}

// two edge dev runs on 8787 at once fail with EADDRINUSE
export async function edgeProject(
    vars: Record<string, string> = liveVars
): Promise<{ projectDir: string; port: number }> {
    const projectDir = await copyEdgeBotForTest();
    await writeDevVars(projectDir, vars);
    const port = await freePort();
    await setDevPort(projectDir, port);
    return { projectDir, port };
}

// the worker's records reach the CLI's logger the way a node bot's records do
export function captureLogs(): LogRecord[] {
    const records: LogRecord[] = [];
    const handle = LoggerChannelRegistry.instance.installSink({
        kind: 'capture',
        onLog: (record) => records.push(record)
    });
    onTestFinished(() => handle.dispose());
    return records;
}

const LOGS_DIR = join(process.cwd(), 'logs');

async function logFiles(): Promise<string[]> {
    return readdir(LOGS_DIR).catch(() => []);
}

// node defaults log at trace and add a combined file only in development
// keep every caller in one test file. parallel files would delete each other's logs here
export async function asDevelopment(): Promise<() => Promise<string>> {
    const environment = Envapter.environment;
    Envapter.environment = Environment.Development;
    const before = new Set(await logFiles());
    const created = async (): Promise<string[]> => {
        const files = await logFiles();
        return files.filter((file) => !before.has(file));
    };
    onTestFinished(async () => {
        Envapter.environment = environment;
        installNodeDefaults();
        for (const file of await created()) await rm(join(LOGS_DIR, file));
    });
    return async () => {
        const files = await created();
        const texts = await Promise.all(files.map((file) => readFile(join(LOGS_DIR, file), 'utf8')));
        return texts.join('');
    };
}

export const messagesOf = (records: LogRecord[]): string[] => records.map((record) => record.message);

export async function startedRuntime(
    projectDir: string,
    onEvent?: DevEventHandler
): Promise<{ runtime: EdgeDevRuntime; instance: SeedcordInstance }> {
    const config = edgeConfig(projectDir);
    const runtime = new EdgeDevRuntime({ kind: 'edge', wranglerConfig: join(projectDir, 'wrangler.jsonc') });
    onTestFinished(() => runtime.stop());
    await runtime.start(onEvent ? { config, onEvent } : { config });
    const { module } = await runtime.loadEntry();
    return { runtime, instance: toSeedcordInstance(await resolveDefaultExport(module), config.instance) };
}
