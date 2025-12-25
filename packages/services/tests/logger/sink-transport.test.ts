/* eslint-disable max-nested-callbacks, @typescript-eslint/no-non-null-assertion, @typescript-eslint/restrict-template-expressions */
import { describe, it, expect, beforeEach } from 'vitest';
import winston from 'winston';

import { SinkTransport } from '../../src/Logger/Transports/SinkTransport';

import type { ILoggerSink, LoggerSinkLogEntry } from '../../src/Logger/Transports/SinkTransport';

describe('SinkTransport', () => {
    let testSink: TestSinkCapture;

    beforeEach(() => {
        testSink = new TestSinkCapture();
    });

    describe('constructor', () => {
        it('should create sink transport', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink
            });

            expect(transport).toBeDefined();
        });

        it('should accept level option', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink,
                level: 'debug'
            });

            expect(transport).toBeDefined();
        });
    });

    describe('log handling', () => {
        it('should forward logs to sink', () => {
            const transport = new SinkTransport({
                channel: 'test-channel',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'info',
                transports: [transport]
            });

            logger.info('Test message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBeGreaterThan(0);
                    const entry = testSink.entries[0]!;
                    expect(entry.channel).toBe('test-channel');
                    expect(entry.rendered).toBeDefined();
                    expect(entry.info).toBeDefined();
                    resolve();
                }, 100);
            });
        });

        it('should handle multiple log entries', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'silly',
                transports: [transport]
            });

            logger.error('Error message');
            logger.warn('Warning message');
            logger.info('Info message');
            logger.debug('Debug message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(4);
                    resolve();
                }, 100);
            });
        });

        it('should include rendered message', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'info',
                format: winston.format.simple(),
                transports: [transport]
            });

            logger.info('Test message with data', { key: 'value' });

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBeGreaterThan(0);
                    const entry = testSink.entries[0]!;
                    expect(typeof entry.rendered).toBe('string');
                    expect(entry.rendered.length).toBeGreaterThan(0);
                    resolve();
                }, 100);
            });
        });

        it('should pass raw info object', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'info',
                transports: [transport]
            });

            logger.info('Test message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBeGreaterThan(0);
                    const entry = testSink.entries[0]!;
                    expect(entry.info).toBeDefined();
                    expect(entry.info.level).toBeDefined();
                    expect(entry.info.message).toBeDefined();
                    resolve();
                }, 100);
            });
        });
    });

    describe('channel resolution', () => {
        it('should use transport channel by default', () => {
            const transport = new SinkTransport({
                channel: 'default-channel',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'info',
                transports: [transport]
            });

            logger.info('Test message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBeGreaterThan(0);
                    expect(testSink.entries[0]!.channel).toBe('default-channel');
                    resolve();
                }, 100);
            });
        });

        it('should use channel from log info if present', () => {
            const transport = new SinkTransport({
                channel: 'default-channel',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'info',
                transports: [transport]
            });

            logger.info('Test message', { channel: 'custom-channel' });

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBeGreaterThan(0);
                    expect(testSink.entries[0]!.channel).toBe('custom-channel');
                    resolve();
                }, 100);
            });
        });
    });

    describe('log levels', () => {
        it('should handle error level', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink,
                level: 'error'
            });

            const logger = winston.createLogger({
                level: 'error',
                transports: [transport]
            });

            logger.error('Error message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(1);
                    expect(testSink.entries[0]!.info.level).toBe('error');
                    resolve();
                }, 100);
            });
        });

        it('should handle warn level', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink,
                level: 'warn'
            });

            const logger = winston.createLogger({
                level: 'warn',
                transports: [transport]
            });

            logger.warn('Warning message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(1);
                    expect(testSink.entries[0]!.info.level).toBe('warn');
                    resolve();
                }, 100);
            });
        });

        it('should handle info level', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink,
                level: 'info'
            });

            const logger = winston.createLogger({
                level: 'info',
                transports: [transport]
            });

            logger.info('Info message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(1);
                    expect(testSink.entries[0]!.info.level).toBe('info');
                    resolve();
                }, 100);
            });
        });

        it('should handle debug level', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink,
                level: 'debug'
            });

            const logger = winston.createLogger({
                level: 'debug',
                transports: [transport]
            });

            logger.debug('Debug message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(1);
                    expect(testSink.entries[0]!.info.level).toBe('debug');
                    resolve();
                }, 100);
            });
        });

        it('should respect level filtering', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink,
                level: 'warn'
            });

            const logger = winston.createLogger({
                level: 'warn',
                transports: [transport]
            });

            logger.error('Error message');
            logger.warn('Warning message');
            logger.info('Info message'); // Should not be logged

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(2);
                    resolve();
                }, 100);
            });
        });
    });

    describe('message formatting', () => {
        it('should handle string messages', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'info',
                transports: [transport]
            });

            logger.info('Simple string message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(1);
                    expect(typeof testSink.entries[0]!.rendered).toBe('string');
                    resolve();
                }, 100);
            });
        });

        it('should handle error objects', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'error',
                transports: [transport]
            });

            const error = new Error('Test error');
            logger.error(error);

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(1);
                    expect(typeof testSink.entries[0]!.rendered).toBe('string');
                    resolve();
                }, 100);
            });
        });

        it('should handle formatted messages', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink
            });

            const logger = winston.createLogger({
                level: 'info',
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message }) => {
                        return `[${timestamp}] ${level}: ${message}`;
                    })
                ),
                transports: [transport]
            });

            logger.info('Formatted message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBe(1);
                    const rendered = testSink.entries[0]!.rendered;
                    expect(rendered).toContain('info');
                    expect(rendered).toContain('Formatted message');
                    resolve();
                }, 100);
            });
        });
    });

    describe('event emission', () => {
        it('should emit logged event', () => {
            const transport = new SinkTransport({
                channel: 'test',
                sink: testSink
            });

            let eventEmitted = false;
            transport.on('logged', () => {
                eventEmitted = true;
            });

            const logger = winston.createLogger({
                level: 'info',
                transports: [transport]
            });

            logger.info('Test message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(eventEmitted).toBe(true);
                    resolve();
                }, 100);
            });
        });
    });
});

class TestSinkCapture implements ILoggerSink {
    public readonly entries: LoggerSinkLogEntry[] = [];

    public onLog(entry: LoggerSinkLogEntry): void {
        this.entries.push(entry);
    }

    public clear(): void {
        this.entries.length = 0;
    }
}
