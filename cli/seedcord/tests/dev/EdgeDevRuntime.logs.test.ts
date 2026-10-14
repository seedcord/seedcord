import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { LoggerChannelRegistry } from '@seedcord/logger';
import chalk from 'chalk';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import {
    asDevelopment,
    captureLogs,
    edgeProject,
    editFile,
    fakeDiscordApi,
    liveVars,
    messagesOf,
    startedRuntime,
    waveHandler
} from './edgeDevRuntime';

describe('EdgeDevRuntime logs', () => {
    it("logs each request the endpoint passes to the bot, like a node bot's engine does", async () => {
        // a development env logs at debug, in the worker and in the CLI
        await asDevelopment();
        const { projectDir, port } = await edgeProject({ ...liveVars, ENVIRONMENT: 'development' });
        const logs = captureLogs();
        const { runtime, instance } = await startedRuntime(projectDir);
        await runtime.startBot(instance);

        await fetch(`http://localhost:${port}/`, { method: 'POST', body: '{}' });

        await vi.waitFor(() => {
            expect(messagesOf(logs).map((message) => stripVTControlCharacters(message))).toContain('POST unsigned 401');
        });
    }, 120_000);

    it('leaves the folder the log file goes to out of hot reload', async () => {
        await asDevelopment();
        const { projectDir } = await edgeProject();
        // the log file goes under the cwd. a bot runs seedcord dev from its project folder
        const cwd = process.cwd();
        process.chdir(projectDir);
        onTestFinished(() => process.chdir(cwd));
        const logs = captureLogs();
        const { runtime, instance } = await startedRuntime(projectDir);
        await runtime.startBot(instance);
        const hmrLines = (): string[] =>
            logs.filter((record) => record.label === 'HMR').map((record) => stripVTControlCharacters(record.message));

        await mkdir(join(projectDir, 'logs'), { recursive: true });
        await appendFile(join(projectDir, 'logs/combined.log'), 'a line\n');
        await writeFile(join(projectDir, 'src/handlers/Touched.ts'), 'export const touched = 1;\n');

        await vi.waitFor(() => expect(hmrLines()).toContainEqual(expect.stringContaining('src/handlers/Touched.ts')));
        expect(hmrLines().filter((line) => line.includes('logs/'))).toEqual([]);
    }, 120_000);

    it.each(['dist', '.seedcord', '.wrangler'])(
        'leaves %s out of hot reload',
        async (folder) => {
            await asDevelopment();
            const { projectDir } = await edgeProject();
            const logs = captureLogs();
            const { runtime, instance } = await startedRuntime(projectDir);
            await runtime.startBot(instance);
            const hmrLines = (): string[] =>
                logs
                    .filter((record) => record.label === 'HMR')
                    .map((record) => stripVTControlCharacters(record.message));

            await mkdir(join(projectDir, folder), { recursive: true });
            await writeFile(join(projectDir, folder, 'written.js'), 'export const written = 1;\n');
            await writeFile(join(projectDir, 'src/handlers/Touched.ts'), 'export const touched = 1;\n');

            await vi.waitFor(() =>
                expect(hmrLines()).toContainEqual(expect.stringContaining('src/handlers/Touched.ts'))
            );
            expect(hmrLines().filter((line) => line.includes(`${folder}/`))).toEqual([]);
        },
        120_000
    );

    it("reports the worker's logs", async () => {
        const { projectDir } = await edgeProject();
        const logs = captureLogs();
        const { runtime, instance } = await startedRuntime(projectDir);

        await runtime.startBot(instance);

        expect(logs.map((record) => record.message)).toContain('Coordinated startup completed successfully');
    }, 120_000);

    it("reports a console.log from the bot's own code", async () => {
        const { projectDir } = await edgeProject();
        await appendFile(join(projectDir, 'src/bot.ts'), "\nconsole.log('counter ready');\n");
        const logs = captureLogs();
        const { runtime, instance } = await startedRuntime(projectDir);

        await runtime.startBot(instance);

        expect(messagesOf(logs)).toContainEqual(expect.stringContaining('counter ready'));
    }, 120_000);

    it("colors the worker's logs at the CLI's color level", async () => {
        const { projectDir } = await edgeProject();
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
        const { runtime, instance } = await startedRuntime(projectDir);

        await runtime.startBot(instance);

        // usernameOf paints the username sky blue, #8fc7ff
        expect(messagesOf(logs).find((message) => message.startsWith('Running as'))).toContain(
            '\u001B[38;2;143;199;255m'
        );
    }, 120_000);

    it("writes the worker's file paths relative to the CLI's cwd", async () => {
        await asDevelopment();
        const { projectDir } = await edgeProject();
        await writeFile(join(projectDir, 'src/handlers/Wave.ts'), waveHandler('waved'));
        const records = captureLogs();
        const { runtime, instance } = await startedRuntime(projectDir);

        await runtime.startBot(instance);

        const loaded = JSON.stringify(records.filter((record) => record.message.startsWith('Loaded handlers')));
        expect(loaded).toContain(relative(process.cwd(), join(projectDir, 'src/handlers/Wave.ts')));
        expect(loaded).not.toContain('../');
    }, 120_000);

    it("writes the worker's logs to the session's log file after a server session reset the logger", async () => {
        const createdLogs = await asDevelopment();
        // what ServerHost.reset leaves behind
        LoggerChannelRegistry.instance.configure({});
        const { projectDir } = await edgeProject();
        const { runtime, instance } = await startedRuntime(projectDir);

        await runtime.startBot(instance);

        await vi.waitFor(async () => {
            expect(await createdLogs()).toContain('Coordinated startup completed successfully');
        });
    }, 120_000);
});
