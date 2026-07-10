import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Envapter } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoggerChannelRegistry } from '../src/LoggerChannelRegistry';
import { formatBody, formatPretty, installNodeDefaults, WinstonConsoleSink, WinstonFileSink } from '../src/node';

import type { ILogSink, LogRecord } from '../src/types';

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

const ANSI = /\[\d+m/gu;
const plain = (value: string): string => value.replaceAll(ANSI, '');

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
});

describe('winston sinks', () => {
    it('the console sink logs without throwing', () => {
        const sink = new WinstonConsoleSink({ format: 'json' });
        expect(() => sink.onLog(record({ message: 'hi', args: [{ a: 1 }] }))).not.toThrow();
    });

    it('the file sink writes a record to disk', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'seedcord-logger-'));
        const filename = join(dir, 'out.log');
        const sink = new WinstonFileSink({ filename, format: 'json' });

        sink.onLog(record({ message: 'to-disk', channel: 'events' }));
        const content = await readWhenWritten(filename);

        expect(content).toContain('to-disk');
        expect(content).toContain('events');
        sink.dispose();
    });

    it('the json sink stamps the record timestamp as ISO, not the format-time now', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'seedcord-logger-'));
        const filename = join(dir, 'ts.log');
        const sink = new WinstonFileSink({ filename, format: 'json' });

        const ts = 1_600_000_000_000;
        sink.onLog(record({ message: 'stamped', timestamp: ts }));
        const content = await readWhenWritten(filename);
        const line = content.trim().split('\n')[0] ?? '{}';
        expect((JSON.parse(line) as { timestamp?: string }).timestamp).toBe(new Date(ts).toISOString());
        sink.dispose();
    });

    it('expands {timestamp} in the file name', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'seedcord-logger-'));
        const sink = new WinstonFileSink({ filename: join(dir, 'run-{timestamp}.log'), format: 'json' });

        sink.onLog(record({ message: 'stamped' }));
        await new Promise((resolve) => setTimeout(resolve, 100));

        const written = readdirSync(dir);
        expect(written).toHaveLength(1);
        expect(written[0]).toMatch(/^run-\d{4}-\d{2}-\d{2}-\d{6}\.log$/u);
        sink.dispose();
    });

    it('expands {date} in the file name', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'seedcord-logger-'));
        const sink = new WinstonFileSink({ filename: join(dir, 'run-{date}.log'), format: 'json' });

        sink.onLog(record({ message: 'stamped' }));
        await new Promise((resolve) => setTimeout(resolve, 100));

        const written = readdirSync(dir);
        expect(written).toHaveLength(1);
        expect(written[0]).toMatch(/^run-\d{4}-\d{2}-\d{2}\.log$/u);
        sink.dispose();
    });

    it('writes the pretty file format ANSI-stripped', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'seedcord-logger-'));
        const filename = join(dir, 'pretty.log');
        const sink = new WinstonFileSink({ filename, format: 'pretty' });

        sink.onLog(record({ level: 'warn', message: 'to-file', label: 'Bot' }));
        const content = await readWhenWritten(filename);

        expect(content).toContain('to-file');
        expect(content).toContain('warn');
        expect(content).not.toContain(String.fromCharCode(27));
        sink.dispose();
    });

    it('the file sink is disposable via using', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'seedcord-logger-'));
        const filename = join(dir, 'scoped.log');
        {
            using sink = new WinstonFileSink({ filename, format: 'json' });
            sink.onLog(record({ message: 'scoped-write' }));
        }
        const content = await readWhenWritten(filename);
        expect(content).toContain('scoped-write');
    });

    it('marks node sinks with node: true', () => {
        expect(new WinstonConsoleSink().node).toBe(true);
        expect(new WinstonFileSink({ filename: join(mkdtempSync(join(tmpdir(), 'sc-')), 'x.log') }).node).toBe(true);
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
        const dir = mkdtempSync(join(tmpdir(), 'seedcord-logger-'));
        process.chdir(dir);
        try {
            installNodeDefaults({ sinks: [{ kind: 'console', onLog: () => undefined }] });
            expect(readdirSync(dir)).not.toContain('logs');
        } finally {
            process.chdir(cwd);
            devSpy.mockRestore();
        }
    });
});
