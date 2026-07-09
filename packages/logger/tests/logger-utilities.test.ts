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

    it('draws a box around content', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).box('Title', ['line one']);
        const joined = logger.calls.map((c) => c.text).join('\n');
        expect(joined).toContain('Title');
        expect(joined).toContain('line one');
        expect(joined).toContain('╭');
    });

    it('draws a box with empty content', () => {
        const logger = new FakeLogger();
        new LoggerUtilities(logger).box('Solo', []);
        const joined = logger.calls.map((c) => c.text).join('\n');
        expect(joined).toContain('Solo');
        expect(joined).toContain('╭');
        expect(joined).toContain('╰');
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
});
