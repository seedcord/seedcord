import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { LoggerChannelRegistry } from '@seedcord/logger';
import { posixRelative } from '@seedcord/utils/internal';
import chalk from 'chalk';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';

import {
    asDevelopment,
    captureLogs,
    developmentMode,
    edgeProject,
    editFile,
    fakeDiscordApi,
    liveVars,
    logCapture,
    messagesOf,
    projectLogs,
    startedRuntime,
    waveHandler
} from './edgeDevRuntime';

import type { LogRecord } from '@seedcord/types';

describe('EdgeDevRuntime logs from one started bot', () => {
    let records: LogRecord[];
    let port: () => number;
    let wavePath: string;

    beforeAll(async () => {
        await using setup = new AsyncDisposableStack();
        // a development env logs at debug, in the worker and in the CLI
        setup.use(developmentMode());
        const { projectDir } = setup.use(await edgeProject({ ...liveVars, ENVIRONMENT: 'development' }));
        await appendFile(join(projectDir, 'src/bot.ts'), "\nconsole.log('counter ready');\n");
        wavePath = join(projectDir, 'src/handlers/Wave.ts');
        await writeFile(wavePath, waveHandler('waved'));
        ({ records } = setup.use(logCapture()));
        const started = setup.use(await startedRuntime(projectDir));
        await started.runtime.startBot(started.instance);
        port = () => started.port();
        const owned = setup.move();
        return () => owned.disposeAsync();
    }, 120_000);

    it("reports the worker's logs", () => {
        expect(messagesOf(records)).toContain('Coordinated startup completed successfully');
    });

    it("reports a console.log from the bot's own code under the Console label", () => {
        expect(records).toContainEqual(expect.objectContaining({ label: 'Console', message: 'counter ready' }));
    });

    it("writes the worker's file paths relative to the CLI's cwd", () => {
        const loaded = JSON.stringify(records.filter((record) => record.message.startsWith('Loaded handlers')));

        expect(loaded).toContain(posixRelative(process.cwd(), wavePath));
        expect(loaded).not.toContain('../');
    });

    it("logs each request the endpoint passes to the bot, like a node bot's engine does", async () => {
        await fetch(`http://localhost:${port()}/`, { method: 'POST', body: '{}' });

        await vi.waitFor(() => {
            expect(messagesOf(records).map((message) => stripVTControlCharacters(message))).toContain(
                'POST unsigned 401'
            );
        });
    });
});

describe('EdgeDevRuntime hot reload', () => {
    let projectDir: string;
    let records: LogRecord[];

    beforeAll(async () => {
        await using setup = new AsyncDisposableStack();
        setup.use(developmentMode());
        const project = setup.use(await edgeProject());
        projectDir = project.projectDir;
        ({ records } = setup.use(logCapture()));
        const started = setup.use(await startedRuntime(projectDir));
        await started.runtime.startBot(started.instance);
        const owned = setup.move();
        return () => owned.disposeAsync();
    }, 120_000);

    const hmrLines = (): string[] =>
        records.filter((record) => record.label === 'HMR').map((record) => stripVTControlCharacters(record.message));

    it.each([
        ['the folder the log file goes to', 'logs', 'combined.log'],
        ['dist', 'dist', 'written.js'],
        ['.seedcord', '.seedcord', 'written.js'],
        ['.cloudflare', '.cloudflare', 'written.js']
    ])('leaves %s out of hot reload', async (_shown, folder, file) => {
        const handler = `src/handlers/Touched${folder.replaceAll(/\W/g, '')}.ts`;

        await mkdir(join(projectDir, folder), { recursive: true });
        await appendFile(join(projectDir, folder, file), 'export const written = 1;\n');
        await writeFile(join(projectDir, handler), 'export const touched = 1;\n');

        await vi.waitFor(() => expect(hmrLines()).toContainEqual(expect.stringContaining(handler)));
        expect(hmrLines().filter((line) => line.includes(`${folder}/`))).toEqual([]);
    });
});

describe('EdgeDevRuntime logs', () => {
    it("colors the worker's logs at the CLI's color level", async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const discord = await fakeDiscordApi();
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text.replace('bot: { interactions:', `bot: { restOptions: { api: '${discord.api}' }, interactions:`)
        );
        const level = chalk.level;
        chalk.level = 3;
        onTestFinished(() => {
            chalk.level = level;
        });
        const logs = captureLogs();
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;

        await runtime.startBot(instance);

        // usernameOf paints the username sky blue, #8fc7ff
        expect(messagesOf(logs).find((message) => message.startsWith('Running as'))).toContain(
            '\u001B[38;2;143;199;255m'
        );
    }, 120_000);

    it("writes the worker's logs to the session's log file after a server session reset the logger", async () => {
        asDevelopment();
        // what ServerHost.reset leaves behind
        LoggerChannelRegistry.instance.configure({});
        await using project = await edgeProject();
        const { projectDir } = project;
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;

        await runtime.startBot(instance);

        await vi.waitFor(async () => {
            expect(await projectLogs(projectDir)).toContain('Coordinated startup completed successfully');
        });
    }, 120_000);
});
