import { Writable } from 'node:stream';

import { describe, it, expect, beforeEach } from 'vitest';
import winston from 'winston';

import { LogFormatter } from '../../src';

function createTestLogger(formatter: LogFormatter, level = 'info'): { logger: winston.Logger; output: string[] } {
    const output: string[] = [];

    const writableStream = new Writable({
        write(chunk, _encoding, callback) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            output.push(chunk.toString().trim());
            callback();
        }
    });

    const testTransport = new winston.transports.Stream({
        stream: writableStream,
        format: winston.format.combine(...formatter.pretty())
    });

    const logger = winston.createLogger({
        level,
        format: winston.format.combine(formatter.createPreFormat()),
        transports: [testTransport]
    });

    return { logger, output };
}

describe('LogFormatter', () => {
    let formatter: LogFormatter;

    beforeEach(() => {
        formatter = new LogFormatter();
    });

    describe('pretty format with extras', () => {
        it('should not duplicate primitives when using format specifiers', () => {
            const { logger, output } = createTestLogger(formatter);

            logger.info('File change detected: %s', 'src/components/Button.tsx');

            expect(output[0]).toContain('File change detected: src/components/Button.tsx');
            expect(output[0]).not.toMatch(/src\/components\/Button\.tsx[\s\S]*src\/components\/Button\.tsx/);
        });

        it('should show primitives as extras when NOT using format specifiers', () => {
            const { logger, output } = createTestLogger(formatter);

            logger.info('File change detected:', 'src/components/Button.tsx', 'extra data');

            expect(output[0]).toContain('File change detected:');
            expect(output[0]).toContain('src/components/Button.tsx');
            expect(output[0]).toContain('extra data');
        });

        it('should show object extras in both cases', () => {
            const { logger, output } = createTestLogger(formatter);

            const metadata = { file: 'test.ts', line: 42 };
            logger.info('Something happened', metadata);

            expect(output[0]).toContain('Something happened');
            expect(output[0]).toContain('test.ts');
            expect(output[0]).toContain('42');
        });

        it('should handle multiple format specifiers correctly', () => {
            const { logger, output } = createTestLogger(formatter);

            logger.warn('Full rebuild triggered by %s at line %d', 'src/hooks/useUser.ts', 123);

            expect(output[0]).toContain('Full rebuild triggered by src/hooks/useUser.ts at line 123');
            const matches = output[0]?.match(/src\/hooks\/useUser\.ts/g);
            expect(matches).toHaveLength(1);
        });

        it('should handle mixed splat and extra args (splat + concat)', () => {
            const { logger, output } = createTestLogger(formatter);

            logger.info('Processing %s', 'file.ts', 'extra info', 'more data');

            expect(output[0]).toContain('Processing file.ts');
            expect(output[0]).toContain('extra info');
            expect(output[0]).toContain('more data');
            const fileMatches = output[0]?.match(/file\.ts/g);
            expect(fileMatches).toHaveLength(1);
        });

        it('should handle multiple format specifiers with different types', () => {
            const { logger, output } = createTestLogger(formatter);

            logger.info('Status: %s, progress: %d, ratio: %f', 'complete', 100, 0.95);

            expect(output[0]).toContain('Status: complete, progress: 100, ratio: 0.95');
            expect(output[0]).not.toContain('complete\n');
            expect(output[0]).not.toContain('100\n');
            expect(output[0]).not.toContain('0.95\n');
        });

        it('should handle more args than format specifiers', () => {
            const { logger, output } = createTestLogger(formatter);

            logger.info('User %s logged in', 'john', 'extra1', 'extra2');

            expect(output[0]).toContain('User john logged in');
            expect(output[0]).toContain('extra1');
            expect(output[0]).toContain('extra2');
        });

        it('should handle empty strings and falsy values', () => {
            const { logger, output } = createTestLogger(formatter);

            logger.info('Testing', '', 0, false);

            expect(output[0]).toContain('Testing');
            expect(output[0]).toContain('0');
            expect(output[0]).toContain('false');
        });

        it('should work with error log level', () => {
            const { logger, output } = createTestLogger(formatter);

            logger.error('Failed to load %s', 'config.json', 'retry pending');

            expect(output[0]).toContain('error');
            expect(output[0]).toContain('Failed to load config.json');
            expect(output[0]).toContain('retry pending');
        });

        it('should work with debug log level', () => {
            const { logger, output } = createTestLogger(formatter, 'debug');

            logger.debug('Debug info', 'value1', 'value2');

            expect(output[0]).toContain('debug');
            expect(output[0]).toContain('Debug info');
            expect(output[0]).toContain('value1');
            expect(output[0]).toContain('value2');
        });

        it('should work with verbose log level', () => {
            const { logger, output } = createTestLogger(formatter, 'verbose');

            logger.verbose('Verbose message %s', 'detail', 'extra');

            expect(output[0]).toContain('verbose');
            expect(output[0]).toContain('Verbose message detail');
            expect(output[0]).toContain('extra');
        });

        it('should handle mix of primitives and objects', () => {
            const { logger, output } = createTestLogger(formatter);

            const obj = { status: 'ok', code: 200 };
            logger.info('Request completed', 'path:/api/users', obj, 'duration:150ms');

            expect(output[0]).toContain('Request completed');
            expect(output[0]).toContain('path:/api/users');
            expect(output[0]).toContain('status');
            expect(output[0]).toContain('ok');
            expect(output[0]).toContain('duration:150ms');
        });

        it('should handle object with splat', () => {
            const { logger, output } = createTestLogger(formatter);

            const metadata = { requestId: 'abc123', userId: 42 };
            logger.info('User action: %s', 'login', metadata);

            expect(output[0]).toContain('User action: login');
            expect(output[0]).toContain('requestId');
            expect(output[0]).toContain('abc123');
            expect(output[0]).toContain('userId');
            expect(output[0]).toContain('42');
        });
    });
});
