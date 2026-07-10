import { describe, expect, it } from 'vitest';

import { LoggerUtilities } from '../src/LoggerUtilities';

import type { LogLevel } from '../src/types';
import type { ILogger } from '@seedcord/types';

class FakeLogger implements ILogger {
    public readonly calls: { level: LogLevel; text: string }[] = [];
    public error = this.record('error');
    public warn = this.record('warn');
    public info = this.record('info');
    public debug = this.record('debug');
    public trace = this.record('trace');

    private record(level: LogLevel) {
        return (text: string): void => void this.calls.push({ level, text });
    }
}

const plain = (value: string): string =>
    value.replaceAll(new RegExp(String.raw`${String.fromCharCode(27)}\[[0-9;]*m`, 'gu'), '');

describe('LoggerUtilities', () => {
    it('logs an item at the given level', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).item('hello', 'debug');
        expect(logger.calls[0]?.level).toBe('debug');
        expect(logger.calls[0]?.text).toContain('hello');
    });

    it('logs a list with a heading', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).list(['a', 'b'], 'Items');
        expect(logger.calls.map((c) => c.text.replace(/.*→ /u, '').trim())).toContain('a');
        expect(logger.calls[0]?.text).toContain('Items');
    });

    it('renders a summary title with counts', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).summary('Loaded', { handlers: 5 });
        expect(logger.calls[0]?.text).toContain('Loaded');
        expect(logger.calls[0]?.text).toContain('5');
    });

    it('formats a registration path relative to cwd', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).registration('Ping', `${process.cwd()}/src/Ping.ts`, 'handler');
        const text = logger.calls[0]?.text ?? '';
        expect(text).toContain('Ping');
        expect(text).toContain('./src/Ping.ts');
    });

    it('leaves an out-of-cwd path unchanged', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).registration('Ping', '/elsewhere/Ping.ts');
        expect(logger.calls[0]?.text).toContain('/elsewhere/Ping.ts');
    });

    it('logs initialization start and end', () => {
        const logger = new FakeLogger();
        const utils = new LoggerUtilities(logger);
        utils.initialization('Bot', 'start');
        utils.initialization('Bot', 'end');
        expect(logger.calls[0]?.text).toContain('Initializing Bot');
        expect(logger.calls[1]?.text).toContain('Initialized Bot');
    });

    it('logs progress with and without an item label', () => {
        const logger = new FakeLogger();
        const utils = new LoggerUtilities(logger);
        utils.progress(3, 10);
        utils.progress(10, 10, 'commands');
        expect(logger.calls[0]?.text).toContain('[3/10]');
        expect(logger.calls[1]?.text).toContain('[10/10]');
        expect(logger.calls[1]?.text).toContain('commands');
    });

    it('honors the level argument', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).summary('Done', { tasks: 2 }, 'debug');
        expect(logger.calls[0]?.level).toBe('debug');
    });

    it('emits a block as one record, the heading and lines joined by newlines', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).block('Loaded handlers', ['alpha', 'beta'], 'trace');

        expect(logger.calls).toHaveLength(1);
        expect(logger.calls[0]?.level).toBe('trace');
        const parts = (logger.calls[0]?.text ?? '').split('\n');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toContain('Loaded handlers');
        expect(parts[1]).toContain('alpha');
        expect(parts[2]).toContain('beta');
    });

    it('formats block entries with cwd-relative paths, padding names so the paths align', () => {
        const [short, long] = new LoggerUtilities(new FakeLogger()).entries([
            { name: 'FeedNav', from: `${process.cwd()}/src/Feed.ts` },
            { name: 'LongerHandlerName', from: `${process.cwd()}/src/Other.ts` }
        ]);
        expect(short).toContain('./src/Feed.ts');
        expect(long).toContain('LongerHandlerName');
        expect(plain(short ?? '').indexOf('./src/')).toBe(plain(long ?? '').indexOf('./src/'));
    });

    it('drops zero counts', () => {
        const lines = new LoggerUtilities(new FakeLogger()).counts({ slash: 7, modals: 0, buttons: 3 });
        const joined = lines.join(' ');
        expect(joined).toContain('7 slash');
        expect(joined).toContain('3 buttons');
        expect(joined).not.toContain('modals');
    });

    it('wraps counts onto multiple lines past the max width', () => {
        const lines = new LoggerUtilities(new FakeLogger()).counts({ aa: 1, bb: 2, cc: 3, dd: 4 }, 8);
        expect(lines.length).toBeGreaterThan(1);
    });

    it('wraps labels into lines under the max width', () => {
        const lines = new LoggerUtilities(new FakeLogger()).wrap(['alpha', 'beta', 'gamma', 'delta'], 14);
        expect(lines.length).toBeGreaterThan(1);
        for (const line of lines) expect(plain(line).length).toBeLessThanOrEqual(14);
    });

    it('logs nothing for an empty list and only the heading when one is given', () => {
        const empty = new FakeLogger();
        new LoggerUtilities(empty).list([]);
        expect(empty.calls).toHaveLength(0);

        const headed = new FakeLogger();
        new LoggerUtilities(headed).list([], 'Items');
        expect(headed.calls.map((call) => call.text)).toEqual(['Items']);
    });
});
