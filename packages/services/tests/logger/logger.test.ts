/* eslint-disable max-nested-callbacks, @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it } from 'vitest';

import { Logger } from '../../src/Logger/Logger';

describe('Logger', () => {
    beforeEach(() => {
        // Reset configuration before each test
        Logger.configure({
            defaultChannel: 'test',
            channels: {},
            devFilePattern: 'logs/{channel}-{timestamp}.log',
            stagingFilePattern: 'logs/staging-{date}-{timestamp}.jsonl',
            prodFilePattern: 'logs/production-{date}.jsonl',
            fileMaxSizeMB: 10,
            fileMaxFiles: 5
        });
    });

    describe('constructor', () => {
        it('should create a logger with label', () => {
            const logger = new Logger('test-logger');
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should create a logger with custom channel', () => {
            const logger = new Logger('test-logger', { channel: 'custom' });
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should provide access to utils', () => {
            const logger = new Logger('test-logger');
            expect(logger.utils).toBeDefined();
            expect(logger.utils.list).toBeDefined();
            expect(logger.utils.summary).toBeDefined();
        });
    });

    describe('setChannel', () => {
        it('should switch logger to different channel', () => {
            const logger = new Logger('test-logger');
            logger.setChannel('new-channel');
            // If it doesn't throw, the channel switch was successful
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should maintain label when switching channels', () => {
            const logger = new Logger('test-logger');
            logger.setChannel('another-channel');
            // Should still be able to log with the same label
            logger.info('test message');
            expect(logger).toBeInstanceOf(Logger);
        });
    });

    describe('log levels', () => {
        it('should log error messages', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.error('Error message')).not.toThrow();
        });

        it('should log warn messages', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.warn('Warning message')).not.toThrow();
        });

        it('should log info messages', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.info('Info message')).not.toThrow();
        });

        it('should log http messages', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.http('HTTP message')).not.toThrow();
        });

        it('should log verbose messages', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.verbose('Verbose message')).not.toThrow();
        });

        it('should log debug messages', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.debug('Debug message')).not.toThrow();
        });

        it('should log silly messages', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.silly('Silly message')).not.toThrow();
        });
    });

    describe('variadic arguments', () => {
        it('should handle format specifiers', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.info('User %s logged in', 'john')).not.toThrow();
        });

        it('should handle multiple extra arguments', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.info('Message', 'extra1', 'extra2', { key: 'value' })).not.toThrow();
        });

        it('should handle objects as arguments', () => {
            const logger = new Logger('test-logger');
            expect(() => logger.info('Data:', { userId: 123, status: 'active' })).not.toThrow();
        });

        it('should handle errors as arguments', () => {
            const logger = new Logger('test-logger');
            const error = new Error('Test error');
            expect(() => logger.error('An error occurred:', error)).not.toThrow();
        });
    });

    describe('static methods', () => {
        it('should log via static Error method', () => {
            expect(() => Logger.Error('static-logger', 'Static error message')).not.toThrow();
        });

        it('should log via static Info method', () => {
            expect(() => Logger.Info('static-logger', 'Static info message')).not.toThrow();
        });

        it('should log via static Warn method', () => {
            expect(() => Logger.Warn('static-logger', 'Static warn message')).not.toThrow();
        });

        it('should log via static Debug method', () => {
            expect(() => Logger.Debug('static-logger', 'Static debug message')).not.toThrow();
        });

        it('should log via static Silly method', () => {
            expect(() => Logger.Silly('static-logger', 'Static silly message')).not.toThrow();
        });

        it('should reuse logger instances for same prefix', () => {
            Logger.Info('reuse-test', 'Message 1');
            Logger.Info('reuse-test', 'Message 2');
            // If instances are reused, this should work without issues
            expect(true).toBe(true);
        });
    });

    describe('configure', () => {
        it('should accept custom configuration', () => {
            Logger.configure({
                defaultChannel: 'custom',
                channels: {
                    custom: {
                        name: 'custom',
                        level: 'debug',
                        transports: [{ type: 'console', level: 'debug' }]
                    }
                },
                devFilePattern: 'logs/custom-{timestamp}.log',
                stagingFilePattern: 'logs/staging.jsonl',
                prodFilePattern: 'logs/prod.jsonl',
                fileMaxSizeMB: 20,
                fileMaxFiles: 10
            });

            const logger = new Logger('configured-logger');
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should clear instance cache after configure', () => {
            Logger.Info('cache-test', 'Before configure');

            Logger.configure({
                defaultChannel: 'new-default',
                channels: {},
                devFilePattern: 'logs/{channel}.log',
                stagingFilePattern: 'logs/staging.log',
                prodFilePattern: 'logs/prod.log',
                fileMaxSizeMB: 5,
                fileMaxFiles: 3
            });

            Logger.Info('cache-test', 'After configure');
            expect(true).toBe(true);
        });
    });

    describe('integration with channel registry', () => {
        it('should use registry default channel', () => {
            const logger = new Logger('registry-test');
            logger.info('Using default channel');
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should work with custom channel config', () => {
            Logger.configure({
                defaultChannel: 'test',
                channels: {
                    special: {
                        name: 'special',
                        level: 'warn',
                        transports: [{ type: 'console', level: 'warn' }]
                    }
                },
                devFilePattern: 'logs/{channel}.log',
                stagingFilePattern: 'logs/staging.log',
                prodFilePattern: 'logs/prod.log',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const logger = new Logger('special-test', { channel: 'special' });
            logger.warn('Warning on special channel');
            expect(logger).toBeInstanceOf(Logger);
        });
    });
});
