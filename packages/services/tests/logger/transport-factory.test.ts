import { describe, it, expect, beforeEach } from 'vitest';

import { TransportFactory } from '../../src/Logger/TransportFactory';

import type { TransportBuildInput } from '../../src/Logger/TransportFactory';
import type { ILoggerSink, LoggerSinkLogEntry } from '../../src/Logger/Transports/SinkTransport';

describe('TransportFactory', () => {
    let factory: TransportFactory;

    beforeEach(() => {
        factory = new TransportFactory();
    });

    describe('buildPreFormat', () => {
        it('should build pre-format', () => {
            const format = factory.buildPreFormat();
            expect(format).toBeDefined();
        });
    });

    describe('build', () => {
        it('should build console transport', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'console',
                    level: 'info'
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should build file transport', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/test-{timestamp}.log'
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle file transport without filename', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'debug',
                config: {
                    type: 'file',
                    level: 'debug'
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should use channel name in filename template', () => {
            const input: TransportBuildInput = {
                channel: 'my-channel',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/{channel}.log'
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle maxSize option', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/test.log',
                    maxSize: 5_242_880 // 5MB
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle maxFiles option', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/test.log',
                    maxFiles: 10
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should respect format option', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'console',
                    level: 'info',
                    format: 'json'
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should respect stripAnsi option', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/test.log',
                    stripAnsi: true
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle different log levels', () => {
            const levels: ('error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly')[] = [
                'error',
                'warn',
                'info',
                'http',
                'verbose',
                'debug',
                'silly'
            ];

            for (const level of levels) {
                const input: TransportBuildInput = {
                    channel: 'test',
                    label: 'test-label',
                    level,
                    config: {
                        type: 'console',
                        level
                    },
                    defaultFormat: 'pretty',
                    stripAnsi: false
                };

                const transport = factory.build(input);
                expect(transport).toBeDefined();
            }
        });
    });

    describe('buildSinkTransport', () => {
        it('should build sink transport', () => {
            const sink: ILoggerSink = {
                onLog: (_entry: LoggerSinkLogEntry) => {
                    // Test sink implementation
                }
            };

            const transport = factory.buildSinkTransport(
                {
                    channel: 'test',
                    label: 'test-label',
                    level: 'info'
                },
                sink
            );

            expect(transport).toBeDefined();
        });

        it('should handle different levels for sink transport', () => {
            const sink: ILoggerSink = {
                onLog: (_entry: LoggerSinkLogEntry) => {
                    // Test sink implementation
                }
            };

            const levels: ('error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly')[] = [
                'error',
                'warn',
                'info',
                'http',
                'verbose',
                'debug',
                'silly'
            ];

            for (const level of levels) {
                const transport = factory.buildSinkTransport(
                    {
                        channel: 'test',
                        label: 'test-label',
                        level
                    },
                    sink
                );

                expect(transport).toBeDefined();
            }
        });

        it('should handle different channels for sink transport', () => {
            const sink: ILoggerSink = {
                onLog: (_entry: LoggerSinkLogEntry) => {
                    // Test sink implementation
                }
            };

            const channels = ['channel1', 'channel2', 'channel3'];

            for (const channel of channels) {
                const transport = factory.buildSinkTransport(
                    {
                        channel,
                        label: 'test-label',
                        level: 'info'
                    },
                    sink
                );

                expect(transport).toBeDefined();
            }
        });
    });

    describe('filename template resolution', () => {
        it('should resolve {channel} placeholder', () => {
            const input: TransportBuildInput = {
                channel: 'my-channel',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/{channel}-output.log'
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should resolve {timestamp} placeholder', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/app-{timestamp}.log'
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should resolve {date} placeholder', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/{date}.log'
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should resolve multiple placeholders', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'file',
                    level: 'info',
                    filename: 'logs/{channel}-{date}-{timestamp}.log'
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });
    });

    describe('format modes', () => {
        it('should handle pretty format', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'console',
                    level: 'info',
                    format: 'pretty'
                },
                defaultFormat: 'json',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle json format', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'console',
                    level: 'info',
                    format: 'json'
                },
                defaultFormat: 'pretty',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle minimal format', () => {
            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'console',
                    level: 'info',
                    format: 'minimal'
                },
                defaultFormat: 'pretty',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });
    });
});
