import { Writable } from 'node:stream';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { Logger } from '../../src/Logger/Logger';

describe('Stream Transport Integration', () => {
    let capturedLogs: Buffer[];
    let mockStream: Writable;

    beforeEach(() => {
        capturedLogs = [];
        mockStream = new Writable({
            write(chunk, _encoding, callback) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                capturedLogs.push(buffer);
                callback();
            }
        });

        Logger.configure({
            defaultChannel: 'stream-test',
            channels: {
                'stream-test': {
                    name: 'stream-test',
                    level: 'debug',
                    transports: [
                        {
                            type: 'stream',
                            stream: mockStream,
                            level: 'debug',
                            format: 'json',
                            stripAnsi: true
                        }
                    ]
                }
            }
        });
    });

    afterEach(() => {
        capturedLogs = [];
    });

    it('should log to stream transport', () => {
        const logger = new Logger('test-prefix', { channel: 'stream-test' });
        logger.info('Test message');

        expect(capturedLogs.length).toBeGreaterThan(0);
    });

    it('should capture multiple log levels in stream', () => {
        const logger = new Logger('test-prefix', { channel: 'stream-test' });

        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');

        expect(capturedLogs.length).toBe(4);
    });

    it('should format logs as JSON in stream', () => {
        const logger = new Logger('test-prefix', { channel: 'stream-test' });
        logger.info('JSON test');

        expect(capturedLogs.length).toBeGreaterThan(0);
        const logEntry = capturedLogs[0]?.toString('utf8') ?? '';
        expect(logEntry).toBeDefined();
        const parseResult = (): unknown => JSON.parse(logEntry);
        expect(parseResult).not.toThrow();
    });

    it('should include log metadata in stream output', () => {
        const logger = new Logger('test-prefix', { channel: 'stream-test' });
        logger.info('Metadata test', { customKey: 'customValue' });

        expect(capturedLogs.length).toBeGreaterThan(0);
        const logText = capturedLogs[0]?.toString('utf8') ?? '{}';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const logEntry = JSON.parse(logText);

        expect(logEntry).toHaveProperty('customKey', 'customValue');
    });

    it('should handle multiple loggers with same stream', () => {
        const logger1 = new Logger('prefix-1', { channel: 'stream-test' });
        const logger2 = new Logger('prefix-2', { channel: 'stream-test' });

        logger1.info('Message from logger 1');
        logger2.info('Message from logger 2');

        expect(capturedLogs.length).toBe(2);
    });

    it('should respect log level filtering in stream transport', () => {
        const levelFilteredLogs: Buffer[] = [];
        const levelFilteredStream = new Writable({
            write(chunk, _encoding, callback) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                levelFilteredLogs.push(buffer);
                callback();
            }
        });

        Logger.configure({
            defaultChannel: 'stream-test',
            channels: {
                'stream-test': {
                    name: 'stream-test',
                    level: 'warn',
                    transports: [
                        {
                            type: 'stream',
                            stream: levelFilteredStream,
                            level: 'warn',
                            format: 'json',
                            stripAnsi: true
                        }
                    ]
                }
            }
        });

        const logger = new Logger('test-prefix', { channel: 'stream-test' });

        logger.error('Error message');
        logger.warn('Warning message');
        logger.info('Info message');
        logger.debug('Debug message');

        // Only error and warn should be logged
        expect(levelFilteredLogs.length).toBe(2);
    });

    it('should handle stream with backpressure', async () => {
        let backpressureCount = 0;
        const slowStream = new Writable({
            write(_chunk, _encoding, callback) {
                backpressureCount++;
                setTimeout(() => callback(), 10);
            }
        });

        Logger.configure({
            defaultChannel: 'stream-test',
            channels: {
                'stream-test': {
                    name: 'stream-test',
                    level: 'info',
                    transports: [
                        {
                            type: 'stream',
                            stream: slowStream,
                            level: 'info'
                        }
                    ]
                }
            }
        });

        const logger = new Logger('test-prefix', { channel: 'stream-test' });
        logger.info('Backpressure test');

        // Give some time for async write
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(backpressureCount).toBe(1);
    });

    it('should handle multiple transports including stream', () => {
        const logs: Buffer[] = [];
        const stream1 = new Writable({
            write(chunk, _encoding, callback) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                logs.push(buffer);
                callback();
            }
        });

        const stream2 = new Writable({
            write(chunk, _encoding, callback) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                logs.push(buffer);
                callback();
            }
        });

        Logger.configure({
            defaultChannel: 'multi-stream',
            channels: {
                'multi-stream': {
                    name: 'multi-stream',
                    level: 'info',
                    transports: [
                        {
                            type: 'stream',
                            stream: stream1,
                            level: 'info'
                        },
                        {
                            type: 'stream',
                            stream: stream2,
                            level: 'info'
                        }
                    ]
                }
            }
        });

        const logger = new Logger('test', { channel: 'multi-stream' });
        logger.info('Multi-stream test');

        expect(logs.length).toBe(2);
    });

    it('should handle stream errors gracefully', () => {
        const errorStream = new Writable({
            write(_chunk, _encoding, callback) {
                callback(new Error('Stream write error'));
            }
        });

        errorStream.on('error', () => {
            // Error handler attached
        });

        Logger.configure({
            defaultChannel: 'error-stream',
            channels: {
                'error-stream': {
                    name: 'error-stream',
                    level: 'info',
                    transports: [
                        {
                            type: 'stream',
                            stream: errorStream,
                            level: 'info'
                        }
                    ]
                }
            }
        });

        const logger = new Logger('test', { channel: 'error-stream' });

        // Should not throw
        expect(() => logger.info('Error test')).not.toThrow();
    });

    it('should strip ANSI codes when stripAnsi is true', () => {
        const logger = new Logger('test-prefix', { channel: 'stream-test' });
        logger.info('Message with \u001b[31mcolor\u001b[0m');

        expect(capturedLogs.length).toBeGreaterThan(0);
        const logEntry = capturedLogs[0]?.toString('utf8') ?? '';
        // Should not contain ANSI escape codes
        expect(logEntry).not.toMatch(/\u001b\[\d+m/);
    });

    it('should handle channel-specific stream transports', () => {
        const channel1Logs: Buffer[] = [];
        const channel2Logs: Buffer[] = [];

        const stream1 = new Writable({
            write(chunk, _encoding, callback) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                channel1Logs.push(buffer);
                callback();
            }
        });

        const stream2 = new Writable({
            write(chunk, _encoding, callback) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                channel2Logs.push(buffer);
                callback();
            }
        });

        Logger.configure({
            defaultChannel: 'channel1',
            channels: {
                channel1: {
                    name: 'channel1',
                    level: 'info',
                    transports: [
                        {
                            type: 'stream',
                            stream: stream1,
                            level: 'info'
                        }
                    ]
                },
                channel2: {
                    name: 'channel2',
                    level: 'info',
                    transports: [
                        {
                            type: 'stream',
                            stream: stream2,
                            level: 'info'
                        }
                    ]
                }
            }
        });

        const logger1 = new Logger('test1', { channel: 'channel1' });
        const logger2 = new Logger('test2', { channel: 'channel2' });

        logger1.info('Channel 1 message');
        logger2.info('Channel 2 message');

        expect(channel1Logs.length).toBe(1);
        expect(channel2Logs.length).toBe(1);
    });

    it('should handle stream with custom encoding', () => {
        const utf8Logs: Buffer[] = [];
        const utf8Stream = new Writable({
            defaultEncoding: 'utf8',
            write(chunk, _encoding, callback) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
                utf8Logs.push(buffer);
                callback();
            }
        });

        Logger.configure({
            defaultChannel: 'utf8-test',
            channels: {
                'utf8-test': {
                    name: 'utf8-test',
                    level: 'info',
                    transports: [
                        {
                            type: 'stream',
                            stream: utf8Stream,
                            level: 'info'
                        }
                    ]
                }
            }
        });

        const logger = new Logger('test', { channel: 'utf8-test' });
        logger.info('UTF-8 test: émojis 🎉');

        expect(utf8Logs.length).toBe(1);
        const logText = utf8Logs[0]?.toString('utf8') ?? '';
        expect(logText).toContain('UTF-8 test: émojis 🎉');
    });

    it('should handle stream that buffers output', () => {
        const buffer: Buffer[] = [];
        const bufferStream = new Writable({
            write(chunk, _encoding, callback) {
                const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                buffer.push(Buffer.from(buf));
                callback();
            }
        });

        Logger.configure({
            defaultChannel: 'buffer-test',
            channels: {
                'buffer-test': {
                    name: 'buffer-test',
                    level: 'info',
                    transports: [
                        {
                            type: 'stream',
                            stream: bufferStream,
                            level: 'info'
                        }
                    ]
                }
            }
        });

        const logger = new Logger('test', { channel: 'buffer-test' });
        logger.info('Buffered message 1');
        logger.info('Buffered message 2');

        expect(buffer.length).toBe(2);
        expect(buffer[0]?.toString()).toContain('Buffered message 1');
        expect(buffer[1]?.toString()).toContain('Buffered message 2');
    });
});
