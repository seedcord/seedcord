/* eslint-disable max-nested-callbacks, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import fs from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Logger } from '../../src/Logger/Logger';

const LOGS_DIR = path.join(__dirname, '../../logs');
const TEST_LOGS_DIR = path.join(__dirname, '../../logs/logs-test');

/**
 * Recursively clean a directory
 * @param dir - Directory to clean
 */
function cleanLogsDirectory(dir: string): void {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                cleanLogsDirectory(filePath);
                fs.rmdirSync(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        }
    }
}

/**
 * Ensure directory exists, create if it doesn't
 * @param dir - Directory path
 */
function ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Wait for files to be written to the directory
 * @param dirPath - Directory to check for files
 * @param maxWait - Maximum time to wait in milliseconds
 * @returns Promise that resolves when files are found or timeout
 */
function waitForFileWrite(dirPath: string, maxWait = 2000): Promise<void> {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            try {
                if (fs.existsSync(dirPath)) {
                    const files = fs.readdirSync(dirPath);
                    if (files.length > 0) {
                        clearInterval(checkInterval);
                        // Give extra time for write to complete and flush
                        setTimeout(resolve, 150);
                        return;
                    }
                }
            } catch {
                // Directory might not exist yet, continue waiting
            }

            if (Date.now() - startTime > maxWait) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 50);
    });
}

describe('Logger File Output', () => {
    beforeAll(() => {
        // Clean both directories before tests
        cleanLogsDirectory(LOGS_DIR);
        cleanLogsDirectory(TEST_LOGS_DIR);
        // Ensure directories exist
        ensureDirectoryExists(LOGS_DIR);
        ensureDirectoryExists(TEST_LOGS_DIR);
    });

    afterAll(() => {
        // Clean up after tests
        cleanLogsDirectory(LOGS_DIR);
        cleanLogsDirectory(TEST_LOGS_DIR);
    });

    beforeEach(() => {
        // Clean before each test
        cleanLogsDirectory(LOGS_DIR);
        cleanLogsDirectory(TEST_LOGS_DIR);
        // Ensure directories exist after cleaning
        ensureDirectoryExists(LOGS_DIR);
        ensureDirectoryExists(TEST_LOGS_DIR);
    });

    describe('file creation', () => {
        it('should create log file when logging', async () => {
            Logger.configure({
                defaultChannel: 'file-test',
                channels: {
                    'file-test': {
                        name: 'file-test',
                        level: 'info',
                        transports: [
                            {
                                type: 'file',
                                level: 'info',
                                filename: 'logs/logs-test/test-{timestamp}.log',
                                format: 'pretty'
                            }
                        ]
                    }
                },
                devFilePattern: 'logs/logs-test/{channel}-{timestamp}.log',
                stagingFilePattern: 'logs/logs-test/staging-{date}-{timestamp}.jsonl',
                prodFilePattern: 'logs/logs-test/production-{date}.jsonl',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const logger = new Logger('file-creation-test', { channel: 'file-test' });
            logger.info('Test message for file creation');
            logger.info('Second message to ensure flush');
            logger.info('Third message to ensure flush');

            await waitForFileWrite(TEST_LOGS_DIR, 2500);

            expect(fs.existsSync(TEST_LOGS_DIR)).toBe(true);
            const files = fs.readdirSync(TEST_LOGS_DIR);
            expect(files.length).toBeGreaterThan(0);
        });

        it('should create log file with channel name in filename', async () => {
            Logger.configure({
                defaultChannel: 'channel-name-test',
                channels: {
                    'channel-name-test': {
                        name: 'channel-name-test',
                        level: 'info',
                        transports: [
                            {
                                type: 'file',
                                level: 'info',
                                filename: 'logs/logs-test/{channel}-output.log',
                                format: 'pretty'
                            }
                        ]
                    }
                },
                devFilePattern: 'logs/logs-test/{channel}-{timestamp}.log',
                stagingFilePattern: 'logs/logs-test/staging-{date}-{timestamp}.jsonl',
                prodFilePattern: 'logs/logs-test/production-{date}.jsonl',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const logger = new Logger('channel-test', { channel: 'channel-name-test' });
            logger.info('Test message');

            await waitForFileWrite(TEST_LOGS_DIR);

            const files = fs.readdirSync(TEST_LOGS_DIR);
            const channelFile = files.find((f) => f.includes('channel-name-test'));
            expect(channelFile).toBeDefined();
        });
    });

    describe('file content - pretty format', () => {
        it('should write log messages in pretty format', async () => {
            Logger.configure({
                defaultChannel: 'pretty-test',
                channels: {
                    'pretty-test': {
                        name: 'pretty-test',
                        level: 'info',
                        transports: [
                            {
                                type: 'file',
                                level: 'info',
                                filename: 'logs/logs-test/pretty-{timestamp}.log',
                                format: 'pretty',
                                stripAnsi: true
                            }
                        ]
                    }
                },
                devFilePattern: 'logs/logs-test/{channel}-{timestamp}.log',
                stagingFilePattern: 'logs/logs-test/staging-{date}-{timestamp}.jsonl',
                prodFilePattern: 'logs/logs-test/production-{date}.jsonl',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const logger = new Logger('pretty-logger', { channel: 'pretty-test' });
            logger.info('This is a pretty formatted message');
            logger.warn('This is a warning');
            logger.error('This is an error');

            await waitForFileWrite(TEST_LOGS_DIR, 1500);

            const files = fs.readdirSync(TEST_LOGS_DIR);
            expect(files.length).toBeGreaterThan(0);

            const logFile = path.join(TEST_LOGS_DIR, files[0]!);
            const content = fs.readFileSync(logFile, 'utf-8');

            expect(content).toContain('pretty-logger');
            expect(content).toContain('This is a pretty formatted message');
            expect(content).toContain('This is a warning');
            expect(content).toContain('This is an error');
        });

        it('should include log levels in pretty format', async () => {
            Logger.configure({
                defaultChannel: 'levels-test',
                channels: {
                    'levels-test': {
                        name: 'levels-test',
                        level: 'silly',
                        transports: [
                            {
                                type: 'file',
                                level: 'silly',
                                filename: 'logs/logs-test/levels-{timestamp}.log',
                                format: 'pretty',
                                stripAnsi: true
                            }
                        ]
                    }
                },
                devFilePattern: 'logs/logs-test/{channel}-{timestamp}.log',
                stagingFilePattern: 'logs/logs-test/staging-{date}-{timestamp}.jsonl',
                prodFilePattern: 'logs/logs-test/production-{date}.jsonl',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const logger = new Logger('levels-logger', { channel: 'levels-test' });
            logger.error('Error level');
            logger.warn('Warn level');
            logger.info('Info level');
            logger.debug('Debug level');

            await waitForFileWrite(TEST_LOGS_DIR, 1500);

            const files = fs.readdirSync(TEST_LOGS_DIR);
            const logFile = path.join(TEST_LOGS_DIR, files[0]!);
            const content = fs.readFileSync(logFile, 'utf-8');

            expect(content).toContain('[error]');
            expect(content).toContain('[warn]');
            expect(content).toContain('[info]');
            expect(content).toContain('[debug]');
        });

        it('should handle extra arguments in pretty format', async () => {
            Logger.configure({
                defaultChannel: 'extras-test',
                channels: {
                    'extras-test': {
                        name: 'extras-test',
                        level: 'info',
                        transports: [
                            {
                                type: 'file',
                                level: 'info',
                                filename: 'logs/logs-test/extras-{timestamp}.log',
                                format: 'pretty',
                                stripAnsi: true
                            }
                        ]
                    }
                },
                devFilePattern: 'logs/logs-test/{channel}-{timestamp}.log',
                stagingFilePattern: 'logs/logs-test/staging-{date}-{timestamp}.jsonl',
                prodFilePattern: 'logs/logs-test/production-{date}.jsonl',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const logger = new Logger('extras-logger', { channel: 'extras-test' });
            logger.info('Message with extras:', 'extra1', 'extra2');
            logger.info('User: %s, Age: %d', 'John', 30);
            logger.info('Data:', { key: 'value', num: 42 });

            await waitForFileWrite(TEST_LOGS_DIR, 1500);

            const files = fs.readdirSync(TEST_LOGS_DIR);
            const logFile = path.join(TEST_LOGS_DIR, files[0]!);
            const content = fs.readFileSync(logFile, 'utf-8');

            expect(content).toContain('Message with extras:');
            expect(content).toContain('extra1');
            expect(content).toContain('extra2');
            expect(content).toContain('John');
            expect(content).toContain('30');
            expect(content).toContain('key');
            expect(content).toContain('value');
        });
    });

    describe('file content - JSON format', () => {
        it('should write log messages in JSON format', async () => {
            Logger.configure({
                defaultChannel: 'json-test',
                channels: {
                    'json-test': {
                        name: 'json-test',
                        level: 'info',
                        transports: [
                            {
                                type: 'file',
                                level: 'info',
                                filename: 'logs/logs-test/json-{timestamp}.jsonl',
                                format: 'json',
                                stripAnsi: true
                            }
                        ]
                    }
                },
                devFilePattern: 'logs/logs-test/{channel}-{timestamp}.log',
                stagingFilePattern: 'logs/logs-test/staging-{date}-{timestamp}.jsonl',
                prodFilePattern: 'logs/logs-test/production-{date}.jsonl',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const logger = new Logger('json-logger', { channel: 'json-test' });
            logger.info('JSON formatted message');
            logger.warn('JSON warning');

            await waitForFileWrite(TEST_LOGS_DIR, 1500);

            const files = fs.readdirSync(TEST_LOGS_DIR);
            const logFile = path.join(TEST_LOGS_DIR, files[0]!);
            const content = fs.readFileSync(logFile, 'utf-8');

            const lines = content.trim().split('\n');
            expect(lines.length).toBeGreaterThan(0);

            const firstLog = JSON.parse(lines[0]!);
            expect(firstLog).toHaveProperty('level');
            expect(firstLog).toHaveProperty('message');
            expect(firstLog).toHaveProperty('timestamp');
            expect(firstLog).toHaveProperty('label');
        });

        it('should include all required fields in JSON logs', async () => {
            Logger.configure({
                defaultChannel: 'json-fields-test',
                channels: {
                    'json-fields-test': {
                        name: 'json-fields-test',
                        level: 'info',
                        transports: [
                            {
                                type: 'file',
                                level: 'info',
                                filename: 'logs/logs-test/json-fields-{timestamp}.jsonl',
                                format: 'json'
                            }
                        ]
                    }
                },
                devFilePattern: 'logs/logs-test/{channel}-{timestamp}.log',
                stagingFilePattern: 'logs/logs-test/staging-{date}-{timestamp}.jsonl',
                prodFilePattern: 'logs/logs-test/production-{date}.jsonl',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const logger = new Logger('json-fields-logger', { channel: 'json-fields-test' });
            logger.info('Test message with data', { userId: 123, action: 'login' });

            await waitForFileWrite(TEST_LOGS_DIR, 1500);

            const files = fs.readdirSync(TEST_LOGS_DIR);
            const logFile = path.join(TEST_LOGS_DIR, files[0]!);
            const content = fs.readFileSync(logFile, 'utf-8');

            const log = JSON.parse(content.trim());
            expect(log.level).toBe('info');
            expect(log.message).toContain('Test message with data');
            expect(log.label).toBe('json-fields-logger');
            expect(log.channel).toBe('json-fields-test');
        });
    });

    describe('multiple channels', () => {
        it('should create separate files for different channels', async () => {
            Logger.configure({
                defaultChannel: 'channel-a',
                channels: {
                    'channel-a': {
                        name: 'channel-a',
                        level: 'info',
                        transports: [
                            {
                                type: 'file',
                                level: 'info',
                                filename: 'logs/logs-test/channel-a.log',
                                format: 'pretty'
                            }
                        ]
                    },
                    'channel-b': {
                        name: 'channel-b',
                        level: 'info',
                        transports: [
                            {
                                type: 'file',
                                level: 'info',
                                filename: 'logs/logs-test/channel-b.log',
                                format: 'pretty'
                            }
                        ]
                    }
                },
                devFilePattern: 'logs/logs-test/{channel}-{timestamp}.log',
                stagingFilePattern: 'logs/logs-test/staging-{date}-{timestamp}.jsonl',
                prodFilePattern: 'logs/logs-test/production-{date}.jsonl',
                fileMaxSizeMB: 10,
                fileMaxFiles: 5
            });

            const loggerA = new Logger('logger-a', { channel: 'channel-a' });
            const loggerB = new Logger('logger-b', { channel: 'channel-b' });

            loggerA.info('Message for channel A');
            loggerB.info('Message for channel B');

            await waitForFileWrite(TEST_LOGS_DIR, 1500);

            const files = fs.readdirSync(TEST_LOGS_DIR);
            expect(files).toContain('channel-a.log');
            expect(files).toContain('channel-b.log');

            const contentA = fs.readFileSync(path.join(TEST_LOGS_DIR, 'channel-a.log'), 'utf-8');
            const contentB = fs.readFileSync(path.join(TEST_LOGS_DIR, 'channel-b.log'), 'utf-8');

            expect(contentA).toContain('Message for channel A');
            expect(contentB).toContain('Message for channel B');
        });
    });
}, 5000);
