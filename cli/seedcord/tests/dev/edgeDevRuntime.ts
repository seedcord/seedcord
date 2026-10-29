import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { logsFolderIn } from '@seedcord/logger/internal';
import { installNodeDefaults } from '@seedcord/logger/node';
import { Envapter, Environment } from 'envapt';
import { onTestFinished } from 'vitest';

import { EdgeDevRuntime } from '#commands/dev/runtime/EdgeDevRuntime';
import { toSeedcordInstance } from '#core/modules/importInstance';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { realPath } from '#core/project/realPath';
import { StateFolder } from '#core/state/StateFolder';
import { copyEdgeBot } from '#tests/commands/build/edgeBot';
import { ED25519_KEY_BYTES, FAKE_TOKEN } from '#tests/commands/build/smoke';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';
import { silentLogger } from '#tests/silentLogger';
import { vitePluginsOf } from '#tests/vitePluginsOf';
import { resolveDefaultExport } from '#utils/resolveDefaultExport';

import type { DevEventHandler } from '#commands/dev/runtime/events';
import type { ResolvedEdgeTarget, ResolvedSeedcordConfig } from '#core/config/schema';
import type { LogRecord } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';

// a port probed up front can go to another worker before the runtime binds it
const ANY_PORT = 0;

function edgeTarget(projectDir: string, port: number): ResolvedEdgeTarget {
    return {
        kind: 'edge',
        cloudflareConfig: realPath(join(projectDir, 'cloudflare.config.ts')),
        viteRoot: realPath(projectDir),
        port
    };
}

export function edgeConfig(projectDir: string, port = ANY_PORT): ResolvedSeedcordConfig {
    return resolvedConfigOf(projectDir, { target: edgeTarget(projectDir, port) });
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

export async function editFile(path: string, edit: (text: string) => string): Promise<void> {
    await writeFile(path, edit(await readFile(path, 'utf8')));
}

// the plugin reads .dev.vars beside cloudflare.config.ts into the worker's env
export async function writeDevVars(projectDir: string, vars: Record<string, string>): Promise<void> {
    const lines = Object.entries(vars).map(([key, value]) => `${key}=${value}\n`);
    await writeFile(join(projectDir, '.dev.vars'), lines.join(''));
}

interface EdgeProject extends AsyncDisposable {
    readonly projectDir: string;
}

export async function edgeProject(vars: Record<string, string> = liveVars): Promise<EdgeProject> {
    await using cleanup = new AsyncDisposableStack();
    const { projectDir, remove } = await copyEdgeBot();
    cleanup.defer(remove);
    await writeDevVars(projectDir, vars);
    const owned = cleanup.move();
    return { projectDir, [Symbol.asyncDispose]: () => owned.disposeAsync() };
}

interface LogCapture extends Disposable {
    readonly records: LogRecord[];
}

// the worker's records reach the CLI's logger the way a node bot's records do
export function logCapture(): LogCapture {
    const records: LogRecord[] = [];
    const handle = LoggerChannelRegistry.instance.installSink({
        kind: 'capture',
        onLog: (record) => records.push(record)
    });
    return { records, [Symbol.dispose]: () => handle.dispose() };
}

export function captureLogs(): LogRecord[] {
    const capture = logCapture();
    onTestFinished(() => capture[Symbol.dispose]());
    return capture.records;
}

// the text of every log file seedcord dev wrote beside the project's config
export async function projectLogs(projectDir: string): Promise<string> {
    const logs = logsFolderIn(projectDir);
    const files = await readdir(logs).catch(() => []);
    const texts = await Promise.all(files.map((file) => readFile(join(logs, file), 'utf8')));
    return texts.join('');
}

// node defaults log at trace and add a combined file only in development
export function developmentMode(): Disposable {
    const environment = Envapter.environment;
    Envapter.environment = Environment.Development;
    return {
        [Symbol.dispose]: () => {
            Envapter.environment = environment;
            installNodeDefaults();
        }
    };
}

export function asDevelopment(): void {
    const mode = developmentMode();
    onTestFinished(() => mode[Symbol.dispose]());
}

export const messagesOf = (records: LogRecord[]): string[] => records.map((record) => record.message);

interface StartedRuntime extends AsyncDisposable {
    readonly runtime: EdgeDevRuntime;
    readonly instance: SeedcordInstance;
    // the endpoint's port, once startBot has finished
    port(): number;
}

interface RuntimeOptions {
    devPort?: number;
    viteMode?: string;
    vitePlugins?: ReturnType<typeof vitePluginsOf>;
    files?: string[];
}

export async function startedRuntime(
    projectDir: string,
    onEvent?: DevEventHandler,
    { devPort = ANY_PORT, viteMode = 'development', vitePlugins = vitePluginsOf(), files = [] }: RuntimeOptions = {}
): Promise<StartedRuntime> {
    const target = edgeTarget(projectDir, devPort);
    const config = resolvedConfigOf(projectDir, {
        target,
        viteMode,
        vitePlugins,
        files: files.map((folder) => realPath(folder))
    });
    const runtime = new EdgeDevRuntime(target);
    let listening: number | undefined;
    const recordPort: DevEventHandler = (event) => {
        if (event.type === 'server-listening') listening = event.port;
        onEvent?.(event);
    };
    await using cleanup = new AsyncDisposableStack();
    cleanup.defer(() => runtime.stop());
    await runtime.start({
        config,
        files: new ProjectFiles(config),
        state: new StateFolder(projectDir, silentLogger),
        onEvent: recordPort
    });
    const { module } = await runtime.loadEntry();
    const instance = toSeedcordInstance(await resolveDefaultExport(module), config.instance);
    const port = (): number => {
        if (listening === undefined) throw new Error('The endpoint is not listening yet. Await startBot first.');
        return listening;
    };
    const owned = cleanup.move();
    return { runtime, instance, port, [Symbol.asyncDispose]: () => owned.disposeAsync() };
}
