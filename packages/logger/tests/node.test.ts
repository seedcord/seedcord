import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempDisposableSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { stripAnsi } from '@seedcord/utils';
import { setBuiltFiles, setDevFiles } from '@seedcord/utils/internal';
import { Envapter } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoggerChannelRegistry } from '#src/LoggerChannelRegistry';
import { formatBody, formatPretty, installNodeDefaults, WinstonConsoleSink, WinstonFileSink } from '#src/node';

import type { ILogSink, LogRecord } from '@seedcord/types';

function record(overrides: Partial<LogRecord>): LogRecord {
    return { level: 'info', message: '', label: 'Bot', channel: 'default', timestamp: Date.now(), ...overrides };
}

// winston's File transport flushes asynchronously, poll until the line is written or timeout
async function readWhenWritten(file: string, timeoutMs = 2000): Promise<string> {
    for (let waited = 0; waited < timeoutMs; waited += 20) {
        try {
            const content = readFileSync(file, 'utf8');
            if (content.length > 0) return content;
        } catch {
            // file not created yet
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return readFileSync(file, 'utf8');
}

async function listWhenWritten(dir: string, timeoutMs = 2000): Promise<string[]> {
    for (let waited = 0; waited < timeoutMs; waited += 20) {
        const written = readdirSync(dir);
        if (written.length > 0) return written;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return readdirSync(dir);
}

const plain = (value: string): string => stripAnsi(value);

// a script without a bot config logs under logs/ in its working folder
function workingFolder(): Disposable & { logs: string } {
    const dir = mkdtempDisposableSync(join(tmpdir(), 'seedcord-logger-'));
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(dir.path);
    return {
        logs: join(dir.path, 'logs'),
        [Symbol.dispose]: () => {
            cwd.mockRestore();
            dir.remove();
        }
    };
}

// the slot the entry of a built bot fills before anything imports seedcord
function asBuiltBot({ root, configFile }: { root: string; configFile: string }): Disposable {
    return setBuiltFiles({
        root,
        configFile,
        listed: [],
        skippedFolders: [],
        folders: [],
        modules: {},
        listedFiles: {}
    });
}

const LOGS_TO_STDOUT = join(import.meta.dirname, 'fixtures/logsToStdout.ts');

const registry = LoggerChannelRegistry.instance;
afterEach(() => registry.reset());

describe('formatPretty', () => {
    it('interpolates args and carries level, label, and message', () => {
        const line = plain(formatPretty(record({ message: 'user %s scored %d', args: ['bob', 42] })));
        expect(line).toContain('info');
        expect(line).toContain('Bot');
        expect(line).toContain('user bob scored 42');
    });

    it('renders an Error stack', () => {
        const line = plain(formatPretty(record({ level: 'error', message: 'failed', args: [new Error('boom')] })));
        expect(line).toContain('failed');
        expect(line).toContain('Error: boom');
        expect(line).toContain('at ');
    });

    it('renders an Error whose stack is undefined', () => {
        const err = new Error('no stack here');
        Object.defineProperty(err, 'stack', { value: undefined, configurable: true });
        const line = plain(formatPretty(record({ level: 'error', message: 'failed', args: [err] })));
        expect(line).toContain('no stack here');
    });

    it('indents continuation lines under the prefixed heading', () => {
        const line = plain(formatPretty(record({ message: 'Loaded\nFeedNav\nProbe' })));
        expect(line).toContain('Loaded\n  FeedNav\n  Probe');
    });
});

describe('formatBody', () => {
    it('renders only the message body, without the level, label, or timestamp chrome', () => {
        const line = plain(formatBody(record({ message: 'hello', label: 'Bot', level: 'warn' })));
        expect(line).toBe('hello');
    });

    it('interpolates args into the body', () => {
        const line = plain(formatBody(record({ message: 'user %s scored %d', args: ['bob', 42] })));
        expect(line).toBe('user bob scored 42');
    });

    it('appends an Error stack and omits the chrome', () => {
        const line = plain(formatBody(record({ level: 'error', message: 'failed', args: [new Error('boom')] })));
        expect(line).toContain('failed');
        expect(line).toContain('Error: boom');
        expect(line).toContain('at ');
        expect(line).not.toContain('[error]');
    });

    it('keeps a multi-line message unindented', () => {
        const line = plain(formatBody(record({ message: 'Loaded\nFeedNav' })));
        expect(line).toBe('Loaded\nFeedNav');
    });

    it('renders the same args for every sink that formats one record', () => {
        const shared = record({ message: 'x', args: ['undefined', '5n'] });

        expect(plain(formatBody(shared))).toBe('x undefined 5n');
        expect(plain(formatBody(shared))).toBe('x undefined 5n');
    });

    it('starts the line with the args when the message is empty', () => {
        expect(plain(formatBody(record({ message: '', args: ['5n'] })))).toBe('5n');
    });

    it('starts the line with the stack when the message is empty', () => {
        const [head] = plain(formatBody(record({ level: 'error', message: '', args: [new Error('boom')] }))).split(
            '\n'
        );

        expect(head).toBe('Error: boom');
    });
});

describe('winston sinks', () => {
    it('the console sink logs without throwing', () => {
        const sink = new WinstonConsoleSink({ format: 'json' });
        expect(() => sink.onLog(record({ message: 'hi', args: [{ a: 1 }] }))).not.toThrow();
    });

    it('the console sink stops writing once its stdout closes', async () => {
        const child = spawn(process.execPath, ['--import', 'tsx', LOGS_TO_STDOUT], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        await once(child.stdout, 'data');

        const exited = new Promise<number | null>((resolve) => child.once('exit', resolve));
        child.stdout.destroy();

        expect(await exited).toBe(0);
    }, 20_000);

    it('the file sink writes a record to disk', async () => {
        using folder = workingFolder();
        using sink = new WinstonFileSink({ filename: 'out.log', format: 'json' });

        sink.onLog(record({ message: 'to-disk', channel: 'events' }));
        const content = await readWhenWritten(join(folder.logs, 'out.log'));

        expect(content).toContain('to-disk');
        expect(content).toContain('events');
    });

    it('the json sink stamps the record timestamp as ISO, not the format-time now', async () => {
        using folder = workingFolder();
        using sink = new WinstonFileSink({ filename: 'ts.log', format: 'json' });

        const ts = 1_600_000_000_000;
        sink.onLog(record({ message: 'stamped', timestamp: ts }));
        const content = await readWhenWritten(join(folder.logs, 'ts.log'));
        const line = content.trim().split('\n')[0] ?? '{}';
        expect((JSON.parse(line) as { timestamp?: string }).timestamp).toBe(new Date(ts).toISOString());
    });

    it('writes the logs folder beside seedcord.config.ts in a built bot', async () => {
        using project = mkdtempDisposableSync(join(tmpdir(), 'seedcord-logger-'));
        writeFileSync(join(project.path, 'seedcord.config.ts'), '');
        using _builtBot = asBuiltBot({ root: join(project.path, 'dist'), configFile: '/../seedcord.config.ts' });
        using sink = new WinstonFileSink({ filename: 'out.log', format: 'json' });

        sink.onLog(record({ message: 'beside the config' }));

        expect(await readWhenWritten(join(project.path, 'logs/out.log'))).toContain('beside the config');
    });

    it('writes the logs folder beside seedcord.config.ts under seedcord dev started in another folder', async () => {
        using project = mkdtempDisposableSync(join(tmpdir(), 'seedcord-logger-'));
        using elsewhere = mkdtempDisposableSync(join(tmpdir(), 'seedcord-logger-'));
        writeFileSync(join(project.path, 'seedcord.config.ts'), '');
        using _cwd = vi.spyOn(process, 'cwd').mockReturnValue(elsewhere.path);
        using _dev = setDevFiles({
            root: join(project.path, 'src'),
            listed: [],
            skippedFolders: [],
            configFile: '/../seedcord.config.ts'
        });
        using sink = new WinstonFileSink({ format: 'json' });

        sink.onLog(record({ message: 'beside the config' }));

        expect(await listWhenWritten(join(project.path, 'logs'))).toHaveLength(1);
    });

    it.each(['logs/out.log', join(tmpdir(), 'out.log')])(
        'throws LoggerFileNameHasFolder for a filename like %s',
        (filename) => {
            expect(() => new WinstonFileSink({ filename })).toThrow(
                expect.objectContaining({ code: SeedcordErrorCode.LoggerFileNameHasFolder })
            );
        }
    );

    it('writes the logs folder in the working folder outside a built bot', async () => {
        using folder = workingFolder();
        using sink = new WinstonFileSink({ filename: 'out.log', format: 'json' });

        sink.onLog(record({ message: 'in the working folder' }));

        expect(await readWhenWritten(join(folder.logs, 'out.log'))).toContain('in the working folder');
    });

    it.each([
        ['{timestamp}', 'run-{timestamp}.log', /^run-\d{4}-\d{2}-\d{2}-\d{6}-\d{3}\.log$/u],
        ['{date}', 'run-{date}.log', /^run-\d{4}-\d{2}-\d{2}\.log$/u]
    ])('expands %s in the file name', async (_, filename, written) => {
        using folder = workingFolder();
        using sink = new WinstonFileSink({ filename, format: 'json' });

        sink.onLog(record({ message: 'stamped' }));

        const files = await listWhenWritten(folder.logs);
        expect(files).toHaveLength(1);
        expect(files[0]).toMatch(written);
    });

    it('writes the pretty file format ANSI-stripped', async () => {
        using folder = workingFolder();
        using sink = new WinstonFileSink({ filename: 'pretty.log', format: 'pretty' });

        sink.onLog(record({ level: 'warn', message: 'to-file', label: 'Bot' }));
        const content = await readWhenWritten(join(folder.logs, 'pretty.log'));

        expect(content).toContain('to-file');
        expect(content).toContain('warn');
        expect(content).not.toContain(String.fromCharCode(27));
    });

    it('the file sink is disposable via using', async () => {
        using folder = workingFolder();
        {
            using sink = new WinstonFileSink({ filename: 'scoped.log', format: 'json' });
            sink.onLog(record({ message: 'scoped-write' }));
        }
        const content = await readWhenWritten(join(folder.logs, 'scoped.log'));
        expect(content).toContain('scoped-write');
    });

    it('marks node sinks with node: true', () => {
        expect(new WinstonConsoleSink().node).toBe(true);
        expect(new WinstonFileSink({ filename: 'x.log' }).node).toBe(true);
    });
});

describe('installNodeDefaults', () => {
    it('configures the registry so records still flow', () => {
        installNodeDefaults();

        const captured: LogRecord[] = [];
        const capture: ILogSink = { kind: 'capture', onLog: (r) => void captured.push(r) };
        registry.installSink(capture, { muteConsole: true });

        registry.dispatch(record({ level: 'error', message: 'flows' }));
        expect(captured.map((r) => r.message)).toContain('flows');
    });

    it('applies a channel level override from overrides', () => {
        installNodeDefaults({ level: 'info', channels: { events: { level: 'error' } } });

        const captured: LogRecord[] = [];
        registry.installSink({ kind: 'capture', onLog: (r) => void captured.push(r) }, { muteConsole: true });

        registry.dispatch(record({ level: 'warn', channel: 'events', message: 'gated' }));
        registry.dispatch(record({ level: 'error', channel: 'events', message: 'kept' }));
        expect(captured.map((r) => r.message)).toEqual(['kept']);
    });

    it('applies an override level and keeps the node sinks', () => {
        installNodeDefaults({ level: 'warn' });

        const captured: LogRecord[] = [];
        registry.installSink({ kind: 'capture', onLog: (r) => void captured.push(r) }, { muteConsole: true });

        registry.dispatch(record({ level: 'error', message: 'kept' }));
        registry.dispatch(record({ level: 'debug', message: 'gated' }));
        expect(captured.map((r) => r.message)).toEqual(['kept']);
    });

    it('replaces the config sinks when overrides provide them', () => {
        const seen: LogRecord[] = [];
        const sink: ILogSink = { kind: 'console', onLog: (r) => void seen.push(r) };
        installNodeDefaults({ sinks: [sink] });

        registry.dispatch(record({ level: 'error', message: 'to-custom' }));
        expect(seen.map((r) => r.message)).toContain('to-custom');
    });

    it('skips the default file sink when overrides provide sinks', () => {
        const devSpy = vi.spyOn(Envapter, 'isDevelopment', 'get').mockReturnValue(true);
        const cwd = process.cwd();
        using dir = mkdtempDisposableSync(join(tmpdir(), 'seedcord-logger-'));
        process.chdir(dir.path);
        try {
            installNodeDefaults({ sinks: [{ kind: 'console', onLog: () => undefined }] });
            expect(readdirSync(dir.path)).not.toContain('logs');
        } finally {
            process.chdir(cwd);
            devSpy.mockRestore();
        }
    });

    it('creates no log file until a record is logged, so repeated bootstraps leave no orphans', async () => {
        const devSpy = vi.spyOn(Envapter, 'isDevelopment', 'get').mockReturnValue(true);
        const cwd = process.cwd();
        using dir = mkdtempDisposableSync(join(tmpdir(), 'seedcord-logger-'));
        process.chdir(dir.path);
        try {
            installNodeDefaults();
            installNodeDefaults();
            // the eager File transport opens its stream on the next tick, so wait past it before asserting
            await new Promise((resolve) => setTimeout(resolve, 100));
            const logsDir = join(dir.path, 'logs');
            const files = existsSync(logsDir) ? readdirSync(logsDir) : [];
            expect(files).toEqual([]);
        } finally {
            process.chdir(cwd);
            devSpy.mockRestore();
        }
    });
});
