import { Writable } from 'node:stream';

import chalk from 'chalk';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import winston from 'winston';

import { LogFormatter } from '#src/node/LogFormatter';
import { NODE_LEVELS } from '#src/node/winston';
import { LEVEL_COLOR } from '#src/palette';

const ESC = String.fromCharCode(27);

function createTestLogger(formatter: LogFormatter, level = 'info'): { logger: winston.Logger; output: string[] } {
    const output: string[] = [];

    const writableStream = new Writable({
        write(chunk: Buffer, _encoding, callback) {
            output.push(chunk.toString().trim());
            callback();
        }
    });

    const testTransport = new winston.transports.Stream({
        stream: writableStream,
        format: winston.format.combine(...formatter.pretty())
    });

    const logger = winston.createLogger({
        levels: NODE_LEVELS,
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
        it('does not duplicate primitives when using format specifiers', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('File change detected: %s', 'src/components/Button.tsx');
            expect(output[0]).toContain('File change detected: src/components/Button.tsx');
            expect(output[0]).not.toMatch(/src\/components\/Button\.tsx[\S\s]*src\/components\/Button\.tsx/u);
        });

        it('shows primitives as extras when not using format specifiers', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('File change detected:', 'src/components/Button.tsx', 'extra data');
            expect(output[0]).toContain('File change detected:');
            expect(output[0]).toContain('src/components/Button.tsx');
            expect(output[0]).toContain('extra data');
        });

        it('shows object extras in both cases', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('Something happened', { file: 'test.ts', line: 42 });
            expect(output[0]).toContain('Something happened');
            expect(output[0]).toContain('test.ts');
            expect(output[0]).toContain('42');
        });

        it('handles multiple format specifiers', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.warn('Full rebuild triggered by %s at line %d', 'src/hooks/useUser.ts', 123);
            expect(output[0]).toContain('Full rebuild triggered by src/hooks/useUser.ts at line 123');
            expect(output[0]?.match(/src\/hooks\/useUser\.ts/gu)).toHaveLength(1);
        });

        it('handles mixed splat and extra args', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('Processing %s', 'file.ts', 'extra info', 'more data');
            expect(output[0]).toContain('Processing file.ts');
            expect(output[0]).toContain('extra info');
            expect(output[0]).toContain('more data');
            expect(output[0]?.match(/file\.ts/gu)).toHaveLength(1);
        });

        it('handles multiple format specifiers with different types', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('Status: %s, progress: %d, ratio: %f', 'complete', 100, 0.95);
            expect(output[0]).toContain('Status: complete, progress: 100, ratio: 0.95');
        });

        it('handles more args than format specifiers', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('User %s logged in', 'john', 'extra1', 'extra2');
            expect(output[0]).toContain('User john logged in');
            expect(output[0]).toContain('extra1');
            expect(output[0]).toContain('extra2');
        });

        it('handles empty strings and falsy values', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('Testing', '', 0, false);
            expect(output[0]).toContain('Testing');
            expect(output[0]).toContain('0');
            expect(output[0]).toContain('false');
        });

        it('works with error level', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.error('Failed to load %s', 'config.json', 'retry pending');
            expect(output[0]).toContain('error');
            expect(output[0]).toContain('Failed to load config.json');
            expect(output[0]).toContain('retry pending');
        });

        it('works with debug level', () => {
            const { logger, output } = createTestLogger(formatter, 'debug');
            logger.debug('Debug info', 'value1', 'value2');
            expect(output[0]).toContain('debug');
            expect(output[0]).toContain('Debug info');
            expect(output[0]).toContain('value1');
        });

        it('works with trace level', () => {
            const { logger, output } = createTestLogger(formatter, 'trace');
            logger.log('trace', 'Trace message %s', 'detail', 'extra');
            expect(output[0]).toContain('trace');
            expect(output[0]).toContain('Trace message detail');
            expect(output[0]).toContain('extra');
        });

        it('handles a mix of primitives and objects', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('Request completed', 'path:/api/users', { status: 'ok', code: 200 }, 'duration:150ms');
            expect(output[0]).toContain('Request completed');
            expect(output[0]).toContain('path:/api/users');
            expect(output[0]).toContain('status');
            expect(output[0]).toContain('duration:150ms');
        });

        it('handles an object with splat', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('User action: %s', 'login', { requestId: 'abc123', userId: 42 });
            expect(output[0]).toContain('User action: login');
            expect(output[0]).toContain('requestId');
            expect(output[0]).toContain('abc123');
        });

        it('renders an object consumed by a format specifier only once', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.info('payload %o', { widget: 7 });
            expect(output[0]).toContain('widget');
            expect((output[0]?.match(/widget/gu) ?? []).length).toBe(1);
        });

        it('preserves an ANSI-formatted error name', () => {
            const { logger, output } = createTestLogger(formatter);
            const error = new Error('Test error message');
            error.name = `${chalk.bold.red('CustomError')}[${chalk.gray('123')}]`;
            logger.error('Operation failed', error);
            expect(output[0]).toContain('Operation failed');
            expect(output[0]).toContain(chalk.bold.red('CustomError'));
            expect(output[0]).toContain('Test error message');
        });

        it('shows the error message once in the line and once in the stack', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.error('Failed', new Error('Unique error message'));
            expect(output[0]).toContain('Failed Unique error message');
            expect(output[0]).toContain('Error: Unique error message');
            expect((output[0]?.match(/Unique error message/gu) ?? []).length).toBe(2);
        });

        it('renders both stacks when a call carries two Errors', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.error('both failed', new Error('first boom'), new Error('second boom'));
            expect(output[0]).toContain('first boom');
            expect(output[0]).toContain('second boom');
        });

        it('renders the direct cause once after the main stack', () => {
            const { logger, output } = createTestLogger(formatter);
            const error = new Error('illegal ack', { cause: new Error('reply() acknowledged this interaction') });
            logger.error('boundary caught', error);
            expect(output[0]).toContain('reply() acknowledged this interaction');
            expect((output[0]?.match(/reply\(\) acknowledged this interaction/gu) ?? []).length).toBe(1);
        });

        it('walks a three-deep cause chain, rendering every level', () => {
            const { logger, output } = createTestLogger(formatter);
            const c = new Error('C deepest');
            const b = new Error('B middle', { cause: c });
            const a = new Error('A top', { cause: b });
            logger.error('boundary caught', a);
            expect(output[0]).toContain('A top');
            expect(output[0]).toContain('B middle');
            expect(output[0]).toContain('C deepest');
        });

        it('renders every member of an aggregate under a numbered heading', () => {
            const { logger, output } = createTestLogger(formatter);
            const aggregate = new AggregateError([new Error('mongo closed'), new Error('pool stuck')], 'two failed');
            logger.error('shutdown caught', aggregate);
            expect(output[0]).toContain('Failure 1 of 2:');
            expect(output[0]).toContain('mongo closed');
            expect(output[0]).toContain('Failure 2 of 2:');
            expect(output[0]).toContain('pool stuck');
        });

        it('caps the members it renders and counts the rest', () => {
            const { logger, output } = createTestLogger(formatter);
            const many = Array.from({ length: 9 }, (_, i) => new Error(`boom ${i}`));
            logger.error('shutdown caught', new AggregateError(many, 'nine failed'));
            expect(output[0]).toContain('boom 0');
            expect(output[0]).toContain('boom 4');
            expect(output[0]).not.toContain('boom 5');
            expect(output[0]).toContain('and 4 more failures');
        });

        it('trims a member stack to its top frames and counts the rest', () => {
            const { logger, output } = createTestLogger(formatter);
            const member = new Error('telemetry flush exceeded its window');
            const frames = Array.from({ length: 30 }, (_, i) => `    at frame${i} (/app/x.mjs:1:1)`);
            member.stack = `Error: telemetry flush exceeded its window\n${frames.join('\n')}`;
            logger.error('shutdown caught', new AggregateError([member], 'one failed'));

            expect(output[0]).toContain('telemetry flush exceeded its window');
            expect(output[0]).toContain('at frame0 ');
            expect(output[0]).toContain('at frame5 ');
            expect(output[0]).not.toContain('at frame6 ');
            expect(output[0]).toContain('24 more frames');
        });

        it('leaves a short member stack whole', () => {
            const { logger, output } = createTestLogger(formatter);
            const member = new Error('pool stuck');
            member.stack = 'Error: pool stuck\n    at only (/app/x.mjs:1:1)';
            logger.error('shutdown caught', new AggregateError([member], 'one failed'));

            expect(output[0]).toContain('at only ');
            expect(output[0]).not.toContain('more frames');
        });

        it('renders a member that carries its own cause', () => {
            const { logger, output } = createTestLogger(formatter);
            const member = new Error('driver refused', { cause: new Error('socket hang up') });
            logger.error('shutdown caught', new AggregateError([member], 'one failed'));
            expect(output[0]).toContain('driver refused');
            expect(output[0]).toContain('socket hang up');
        });
    });

    describe('level coloring', () => {
        const originalChalkLevel = chalk.level;
        // vitest workers are non-TTY, so chalk auto-detects level 0 and emits no color, making the assertions
        // below vacuous. force truecolor so the hex output is real.
        beforeEach(() => {
            chalk.level = 3;
        });
        afterEach(() => {
            chalk.level = originalChalkLevel;
        });

        it('colors the pretty level with the shared truecolor LEVEL_COLOR', () => {
            const { logger, output } = createTestLogger(formatter);
            logger.error('boom');
            expect(output[0]).toContain(ESC);
            expect(output[0]).toContain(chalk.hex(LEVEL_COLOR.error)('error'.padEnd(5)));
        });

        it('pads the level to the longest name in the bracket prefix', () => {
            const output: string[] = [];
            const stream = new Writable({
                write(chunk: Buffer, _encoding, callback) {
                    output.push(chunk.toString().trim());
                    callback();
                }
            });
            const logger = winston.createLogger({
                levels: NODE_LEVELS,
                level: 'trace',
                format: winston.format.combine(formatter.createPreFormat()),
                transports: [
                    new winston.transports.Stream({
                        stream,
                        format: winston.format.combine(...formatter.pretty({ stripExtras: true }))
                    })
                ]
            });
            logger.warn('careful');
            expect(output[0]).toContain('[warn ]');
        });

        it('leaves the level plain and padded when extras are stripped', () => {
            const output: string[] = [];
            const stream = new Writable({
                write(chunk: Buffer, _encoding, callback) {
                    output.push(chunk.toString().trim());
                    callback();
                }
            });
            const logger = winston.createLogger({
                levels: NODE_LEVELS,
                level: 'trace',
                format: winston.format.combine(formatter.createPreFormat()),
                transports: [
                    new winston.transports.Stream({
                        stream,
                        format: winston.format.combine(...formatter.pretty({ stripExtras: true }))
                    })
                ]
            });
            logger.warn('careful');
            expect(output[0]).toContain('warn'.padEnd(5));
            expect(output[0]).not.toContain(ESC);
        });
    });

    describe('json format', () => {
        it('emits parseable json with the message intact on the default path', () => {
            const output: string[] = [];
            const stream = new Writable({
                write(chunk: Buffer, _encoding, callback) {
                    output.push(chunk.toString());
                    callback();
                }
            });
            const logger = winston.createLogger({
                levels: NODE_LEVELS,
                level: 'trace',
                format: winston.format.combine(formatter.createPreFormat()),
                transports: [
                    new winston.transports.Stream({ stream, format: winston.format.combine(...formatter.json()) })
                ]
            });

            logger.info('plain json');

            const parsed = JSON.parse(output.join('')) as { message: string };
            expect(parsed.message).toBe('plain json');
        });

        it('strips ANSI from the message and a colored error', () => {
            const output: string[] = [];
            const stream = new Writable({
                write(chunk: Buffer, _encoding, callback) {
                    output.push(chunk.toString());
                    callback();
                }
            });
            const logger = winston.createLogger({
                levels: NODE_LEVELS,
                level: 'trace',
                format: winston.format.combine(formatter.createPreFormat()),
                transports: [
                    new winston.transports.Stream({
                        stream,
                        format: winston.format.combine(...formatter.json({ stripAnsi: true }))
                    })
                ]
            });

            const err = new Error('bad request');
            err.name = `${ESC}[1m${ESC}[31mSeedcordError${ESC}[39m${ESC}[22m`;
            logger.error(`${ESC}[1mfailed${ESC}[22m`, err);

            const line = output.join('');
            expect(line).not.toContain(ESC);
            const parsed = JSON.parse(line) as { message: string; stack?: string };
            expect(parsed.message).toContain('failed');
            expect(parsed.stack).toContain('SeedcordError');
        });

        it('strips an aggregate whose members reach itself', () => {
            const output: string[] = [];
            const stream = new Writable({
                write(chunk: Buffer, _encoding, callback) {
                    output.push(chunk.toString());
                    callback();
                }
            });
            const logger = winston.createLogger({
                levels: NODE_LEVELS,
                level: 'trace',
                format: winston.format.combine(formatter.createPreFormat()),
                transports: [
                    new winston.transports.Stream({
                        stream,
                        format: winston.format.combine(...formatter.json({ stripAnsi: true }))
                    })
                ]
            });

            const cyclic = new AggregateError([], 'loops');
            cyclic.errors.push(cyclic);

            expect(() => logger.error('shutdown caught', cyclic)).not.toThrow();
            expect(output.join('')).toContain('loops');
        });

        it('strips a cause chain too deep to recurse', () => {
            const stream = new Writable({
                write(_chunk: Buffer, _encoding, callback) {
                    callback();
                }
            });
            const logger = winston.createLogger({
                levels: NODE_LEVELS,
                level: 'trace',
                format: winston.format.combine(formatter.createPreFormat()),
                transports: [
                    new winston.transports.Stream({
                        stream,
                        format: winston.format.combine(...formatter.json({ stripAnsi: true }))
                    })
                ]
            });

            let deep = new Error('leaf');
            for (let level = 0; level < 20_000; level++) deep = new Error(`level ${level}`, { cause: deep });

            expect(() => logger.error('boundary caught', deep)).not.toThrow();
        });
    });
});
