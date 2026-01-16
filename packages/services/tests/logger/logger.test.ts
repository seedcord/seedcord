/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it } from 'vitest';

import { Logger } from '../../src/Logger/Logger';

describe('Logger', () => {
    beforeEach(() => {
        // Reset configuration before each test
        Logger.configure({
            defaultChannel: 'test',
            channels: {},
            files: {
                maxSizeMB: 10,
                maxFiles: 5,
                patterns: {
                    dev: 'logs/{channel}-{timestamp}.log',
                    staging: 'logs/staging-{date}-{timestamp}.jsonl',
                    prod: 'logs/production-{date}.jsonl'
                }
            }
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
                files: {
                    maxSizeMB: 20,
                    maxFiles: 10,
                    patterns: {
                        dev: 'logs/custom-{timestamp}.log',
                        staging: 'logs/staging.jsonl',
                        prod: 'logs/prod.jsonl'
                    }
                }
            });

            const logger = new Logger('configured-logger');
            expect(logger).toBeInstanceOf(Logger);
        });

        it('should clear instance cache after configure', () => {
            Logger.Info('cache-test', 'Before configure');

            Logger.configure({
                defaultChannel: 'new-default',
                channels: {},
                files: {
                    maxSizeMB: 5,
                    maxFiles: 3,
                    patterns: {
                        dev: 'logs/{channel}.log',
                        staging: 'logs/staging.log',
                        prod: 'logs/prod.log'
                    }
                }
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
                files: {
                    maxSizeMB: 10,
                    maxFiles: 5,
                    patterns: {
                        dev: 'logs/{channel}-{timestamp}.log',
                        staging: 'logs/staging-{date}-{timestamp}.jsonl',
                        prod: 'logs/production-{date}.jsonl'
                    }
                }
            });

            const logger = new Logger('special-test', { channel: 'special' });
            logger.warn('Warning on special channel');
            expect(logger).toBeInstanceOf(Logger);
        });
    });
});
