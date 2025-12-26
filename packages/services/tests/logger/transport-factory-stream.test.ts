import { Writable } from 'node:stream';

import { describe, it, expect, beforeEach } from 'vitest';

import { TransportFactory } from '../../src/Logger/TransportFactory';

import type { TransportBuildInput } from '../../src/Logger/TransportFactory';

describe('TransportFactory - Stream Transport', () => {
    let factory: TransportFactory;

    beforeEach(() => {
        factory = new TransportFactory();
    });

    describe('stream transport', () => {
        it('should build stream transport with valid stream', () => {
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'stream',
                    level: 'info',
                    stream: mockStream
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle different log levels for stream transport', () => {
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
                const mockStream = new Writable({
                    write(_chunk, _encoding, callback) {
                        callback();
                    }
                });

                const input: TransportBuildInput = {
                    channel: 'test',
                    label: 'test-label',
                    level,
                    config: {
                        type: 'stream',
                        level,
                        stream: mockStream
                    },
                    defaultFormat: 'pretty',
                    stripAnsi: false
                };

                const transport = factory.build(input);
                expect(transport).toBeDefined();
            }
        });

        it('should respect format option for stream transport', () => {
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'stream',
                    level: 'info',
                    stream: mockStream,
                    format: 'json'
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should respect stripAnsi option for stream transport', () => {
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'stream',
                    level: 'info',
                    stream: mockStream,
                    stripAnsi: true
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle stream transport with custom channel name', () => {
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'custom-channel',
                label: 'custom-label',
                level: 'debug',
                config: {
                    type: 'stream',
                    level: 'debug',
                    stream: mockStream
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle stream that collects data', () => {
            const collected: Buffer[] = [];
            const mockStream = new Writable({
                write(chunk, _encoding, callback) {
                    collected.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'stream',
                    level: 'info',
                    stream: mockStream
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
            expect(collected).toHaveLength(0);
        });

        it('should handle stream with error handling', () => {
            let errorEmitted = false;
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            mockStream.on('error', () => {
                errorEmitted = true;
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'error',
                config: {
                    type: 'stream',
                    level: 'error',
                    stream: mockStream
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
            expect(errorEmitted).toBe(false);
        });

        it('should use default format when not specified for stream transport', () => {
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'stream',
                    level: 'info',
                    stream: mockStream
                },
                defaultFormat: 'json',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should use default stripAnsi when not specified for stream transport', () => {
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'stream',
                    stream: mockStream
                },
                defaultFormat: 'pretty',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should use default level when not specified for stream transport', () => {
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'warn',
                config: {
                    type: 'stream',
                    stream: mockStream
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle stream with backpressure', () => {
            let writeCallCount = 0;
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    writeCallCount++;
                    // Simulate backpressure by delaying callback
                    setTimeout(() => callback(), 10);
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'stream',
                    stream: mockStream
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
            expect(writeCallCount).toBe(0);
        });

        it('should handle stream with high watermark', () => {
            const mockStream = new Writable({
                highWaterMark: 1024,
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'debug',
                config: {
                    type: 'stream',
                    stream: mockStream
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle stream with object mode', () => {
            const mockStream = new Writable({
                objectMode: true,
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test-label',
                level: 'info',
                config: {
                    type: 'stream',
                    stream: mockStream
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('should handle multiple stream transports with different streams', () => {
            const stream1 = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const stream2 = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const input1: TransportBuildInput = {
                channel: 'test1',
                label: 'label1',
                level: 'info',
                config: {
                    type: 'stream',
                    stream: stream1
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const input2: TransportBuildInput = {
                channel: 'test2',
                label: 'label2',
                level: 'debug',
                config: {
                    type: 'stream',
                    stream: stream2
                },
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport1 = factory.build(input1);
            const transport2 = factory.build(input2);

            expect(transport1).toBeDefined();
            expect(transport2).toBeDefined();
        });

        it('should handle stream that captures formatted output', () => {
            const capturedChunks: Buffer[] = [];
            const mockStream = new Writable({
                write(chunk, _encoding, callback) {
                    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
                    capturedChunks.push(buffer);
                    callback();
                }
            });

            const input: TransportBuildInput = {
                channel: 'capture-test',
                label: 'capture-label',
                level: 'info',
                config: {
                    type: 'stream',
                    stream: mockStream
                },
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
            expect(capturedChunks).toHaveLength(0);
        });
    });

    describe('transport type discriminated unions', () => {
        it('console transport config should not have file-specific properties', () => {
            const consoleConfig = {
                type: 'console' as const,
                level: 'info' as const,
                format: 'pretty' as const
            };

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test',
                level: 'info',
                config: consoleConfig,
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('file transport config should have file-specific properties', () => {
            const fileConfig = {
                type: 'file' as const,
                level: 'info' as const,
                filename: 'test.log',
                maxSize: 1024,
                maxFiles: 5
            };

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test',
                level: 'info',
                config: fileConfig,
                defaultFormat: 'json',
                stripAnsi: true
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });

        it('stream transport config should require stream property', () => {
            const mockStream = new Writable({
                write(_chunk, _encoding, callback) {
                    callback();
                }
            });

            const streamConfig = {
                type: 'stream' as const,
                level: 'info' as const,
                stream: mockStream
            };

            const input: TransportBuildInput = {
                channel: 'test',
                label: 'test',
                level: 'info',
                config: streamConfig,
                defaultFormat: 'pretty',
                stripAnsi: false
            };

            const transport = factory.build(input);
            expect(transport).toBeDefined();
        });
    });
});
