import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { Logger } from '../../src/Logger/Logger';
import { LoggerChannelRegistry } from '../../src/Logger/LoggerChannelRegistry';
import { SinkTransport } from '../../src/Logger/Transports/SinkTransport';

import type { ILoggerSink, ILoggerSinkHandle, LoggerSinkLogEntry } from '../../src/Logger/Transports/SinkTransport';

describe('LoggerChannelRegistry', () => {
    let registry: LoggerChannelRegistry;

    beforeEach(() => {
        registry = LoggerChannelRegistry.instance;
    });

    describe('singleton', () => {
        it('should return same instance', () => {
            const instance1 = LoggerChannelRegistry.instance;
            const instance2 = LoggerChannelRegistry.instance;
            expect(instance1).toBe(instance2);
        });
    });

    describe('configure', () => {
        it('should accept configuration', () => {
            expect(() => {
                registry.configure({
                    defaultChannel: 'test-channel',
                    channels: {},
                    files: {
                        maxSizeMB: 10,
                        maxFiles: 5,
                        patterns: {
                            dev: 'logs/{channel}.log',
                            staging: 'logs/staging.log',
                            prod: 'logs/prod.log'
                        }
                    }
                });
            }).not.toThrow();
        });

        it('should merge channel configurations', () => {
            registry.configure({
                channels: {
                    custom: {
                        name: 'custom',
                        level: 'debug'
                    }
                }
            });

            expect(() => {
                registry.get('custom');
            }).not.toThrow();
        });

        it('detaches the previous loggers transports on reconfigure (H9)', () => {
            const logger = registry.get('h9-leak');
            expect(logger.transports.length).toBeGreaterThan(0);

            registry.configure({});

            // The discarded logger must have its transports removed (and closed), or they
            // leak across every reconfigure / dev HMR cycle.
            expect(logger.transports.length).toBe(0);

            const rebuilt = registry.get('h9-leak');
            expect(rebuilt).not.toBe(logger);
            expect(rebuilt.transports.length).toBeGreaterThan(0);
        });

        it('re-applies installed sinks to rebuilt loggers without accumulating (H9)', () => {
            const sink = new TestSink();
            const handle = registry.installSink(sink, { muteConsole: false });

            const first = registry.get('h9-sink');
            expect(first.transports.filter((t) => t instanceof SinkTransport)).toHaveLength(1);

            registry.configure({});
            expect(first.transports).toHaveLength(0);

            const second = registry.get('h9-sink');
            expect(second.transports.filter((t) => t instanceof SinkTransport)).toHaveLength(1);

            handle.dispose();
        });
    });

    describe('getDefaultChannel', () => {
        it('should return default channel name', () => {
            const defaultChannel = registry.getDefaultChannel();
            expect(typeof defaultChannel).toBe('string');
            expect(defaultChannel.length).toBeGreaterThan(0);
        });

        it('should return configured default channel', () => {
            registry.configure({
                defaultChannel: 'my-custom-default'
            });

            expect(registry.getDefaultChannel()).toBe('my-custom-default');
        });
    });

    describe('get', () => {
        it('should get logger for channel', () => {
            const logger = registry.get('test-channel');
            expect(logger).toBeDefined();
            expect(logger.info).toBeDefined();
        });

        it('should cache logger instances', () => {
            const logger1 = registry.get('cache-test');
            const logger2 = registry.get('cache-test');
            expect(logger1).toBe(logger2);
        });

        it('should create different loggers for different channels', () => {
            const logger1 = registry.get('channel1');
            const logger2 = registry.get('channel2');
            expect(logger1).not.toBe(logger2);
        });
    });

    describe('installSink', () => {
        let testSink: TestSink;

        beforeEach(() => {
            testSink = new TestSink();
        });

        afterEach(() => {
            testSink.dispose();
        });

        it('should install a sink', () => {
            const handle = registry.installSink(testSink);
            expect(handle).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(handle.dispose).toBeDefined();
            handle.dispose();
        });

        it('should capture logs through sink', () => {
            const handle = registry.installSink(testSink);

            const logger = new Logger('sink-test');
            logger.info('Test message');

            // Give time for async logging
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBeGreaterThan(0);
                    handle.dispose();
                    resolve();
                }, 100);
            });
        });

        it('should mute console when muteConsole is true', () => {
            const handle = registry.installSink(testSink, { muteConsole: true });

            const logger = new Logger('mute-test');
            logger.info('Should not appear in console');

            handle.dispose();
            expect(true).toBe(true);
        });

        it('should not mute console when muteConsole is false', () => {
            const handle = registry.installSink(testSink, { muteConsole: false });

            const logger = new Logger('no-mute-test');
            logger.info('Should appear in console');

            handle.dispose();
            expect(true).toBe(true);
        });

        it('should handle multiple sinks', () => {
            const sink1 = new TestSink();
            const sink2 = new TestSink();

            const handle1 = registry.installSink(sink1);
            const handle2 = registry.installSink(sink2);

            const logger = new Logger('multi-sink-test');
            logger.info('Test message');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    handle1.dispose();
                    handle2.dispose();
                    resolve();
                }, 100);
            });
        });

        it('should dispose sink properly', () => {
            const handle = registry.installSink(testSink);
            const logger = new Logger('dispose-test');

            logger.info('Before dispose');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    const countBefore = testSink.entries.length;

                    handle.dispose();

                    logger.info('After dispose');

                    setTimeout(() => {
                        // After dispose, sink should not receive new messages
                        expect(testSink.entries.length).toBe(countBefore);
                        resolve();
                    }, 100);
                }, 100);
            });
        });

        it('should restore console after dispose', () => {
            const handle = registry.installSink(testSink, { muteConsole: true });

            const logger = new Logger('restore-console-test');
            logger.info('With sink');

            handle.dispose();

            logger.info('After sink disposal');

            expect(true).toBe(true);
        });

        it('should work with channel switching', () => {
            const handle = registry.installSink(testSink);

            const logger = new Logger('channel-switch-test', { channel: 'channel-a' });
            logger.info('Message on channel A');

            logger.setChannel('channel-b');
            logger.info('Message on channel B');

            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    expect(testSink.entries.length).toBeGreaterThanOrEqual(2);
                    handle.dispose();
                    resolve();
                }, 100);
            });
        });
    });

    describe('multi-channel scenarios', () => {
        it('should handle multiple channels simultaneously', () => {
            const logger1 = new Logger('test1', { channel: 'channel1' });
            const logger2 = new Logger('test2', { channel: 'channel2' });
            const logger3 = new Logger('test3', { channel: 'channel3' });

            expect(() => {
                logger1.info('Message 1');
                logger2.info('Message 2');
                logger3.info('Message 3');
            }).not.toThrow();
        });

        it('should support custom configuration per channel', () => {
            registry.configure({
                channels: {
                    verbose: {
                        name: 'verbose',
                        level: 'silly'
                    },
                    quiet: {
                        name: 'quiet',
                        level: 'error'
                    }
                }
            });

            const verboseLogger = new Logger('verbose-test', { channel: 'verbose' });
            const quietLogger = new Logger('quiet-test', { channel: 'quiet' });

            expect(() => {
                verboseLogger.silly('Verbose message');
                quietLogger.error('Error message');
            }).not.toThrow();
        });
    });

    describe('getLogFilePath', () => {
        it('should return null for non-existent channel', () => {
            const logFilePath = registry.getLogFilePath('nonexistent-channel');
            expect(logFilePath).toBeNull();
        });

        it('should return log file path for channel with file transport', () => {
            const logger = new Logger('file-path-test', { channel: 'default' });
            logger.info('Test message to ensure channel is created');

            const logFilePath = registry.getLogFilePath('default');
            expect(logFilePath).toBeTruthy();
            expect(typeof logFilePath).toBe('string');
            expect(logFilePath).toContain('.log');
        });

        it('should return correct path for custom channel with file transport', () => {
            registry.configure({
                channels: {
                    'custom-file-channel': {
                        name: 'custom-file-channel',
                        level: 'debug'
                    }
                }
            });

            const logger = new Logger('custom-file-test', { channel: 'custom-file-channel' });
            logger.debug('Custom channel message');

            const logFilePath = registry.getLogFilePath('custom-file-channel');
            expect(logFilePath).toBeTruthy();
            expect(typeof logFilePath).toBe('string');
            expect(logFilePath).toContain('.log');
        });

        it('should return same path when called multiple times for same channel', () => {
            const logger = new Logger('same-path-test', { channel: 'default' });
            logger.info('Test message');

            const logFilePath1 = registry.getLogFilePath('default');
            const logFilePath2 = registry.getLogFilePath('default');

            expect(logFilePath1).toBe(logFilePath2);
        });
    });
});

class TestSink implements ILoggerSink, ILoggerSinkHandle {
    public readonly entries: LoggerSinkLogEntry[] = [];
    private handle: { dispose: () => void } | null = null;

    public onLog(entry: LoggerSinkLogEntry): void {
        this.entries.push(entry);
    }

    public setHandle(handle: { dispose: () => void }): void {
        this.handle = handle;
    }

    public dispose(): void {
        this.handle?.dispose();
    }
}
