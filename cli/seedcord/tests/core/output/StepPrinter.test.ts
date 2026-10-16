import { stripVTControlCharacters } from 'node:util';

import { paint } from '@seedcord/errors';
import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { levelMark } from '#core/output/levelMark';
import { StepPrinter } from '#core/output/StepPrinter';

import type { Terminal } from '#core/output/terminal';
import type { ILogSink, LogRecord } from '@seedcord/types';

interface FakeTerminal extends Terminal {
    readonly text: () => string;
}

function pipedTerminal(): FakeTerminal {
    let written = '';
    return {
        isTTY: false,
        columns: 80,
        write: (chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        },
        text: () => stripVTControlCharacters(written)
    };
}

class ConsoleSink implements ILogSink {
    public readonly kind = 'console';
    public readonly records: LogRecord[] = [];
    public onLog(record: LogRecord): void {
        this.records.push(record);
    }
}

const WARN_MARK = stripVTControlCharacters(levelMark('warn'));

let stdout: FakeTerminal;
let stderr: FakeTerminal;

function printer(verbose = false): StepPrinter<'config' | 'type check'> {
    return new StepPrinter({ command: 'build', labels: ['config', 'type check'], verbose, stdout, stderr });
}

beforeEach(() => {
    stdout = pipedTerminal();
    stderr = pipedTerminal();
});

afterEach(() => {
    LoggerChannelRegistry.instance.reset();
});

describe('StepPrinter', () => {
    it('pads each label to the longest one and right-aligns the time after it', async () => {
        const steps = printer();

        await steps.step('config', () => Promise.resolve());
        await steps.step(
            'type check',
            () => Promise.resolve('tsconfig.json'),
            (tsconfig) => tsconfig
        );

        expect(stdout.text()).toMatch(
            new RegExp(
                String.raw`^ {2}${paint.check} config {6}\s+\d+ms\n {2}${paint.check} type check {2}\s+\d+ms {2}tsconfig\.json\n$`,
                'u'
            )
        );
    });

    it('marks a failed step with a cross and rethrows', async () => {
        const failure = new Error('tsc crashed');

        await expect(printer().step('type check', () => Promise.reject(failure))).rejects.toBe(failure);
        expect(stdout.text().startsWith(`  ${paint.cross} type check`)).toBe(true);
    });

    it('holds what the task writes and prints it under the finished step', async () => {
        await printer().step('config', () => {
            stdout.write('loaded 3 feature flags\n');
            return Promise.resolve();
        });

        const [stepLine, heldLine] = stdout.text().split('\n');
        expect(stepLine).toContain(`${paint.check} config`);
        expect(heldLine).toBe('      │ loaded 3 feature flags');
    });

    it('holds seedcord logger output from the console and prints it under the step', async () => {
        const registry = LoggerChannelRegistry.instance;
        const consoleSink = new ConsoleSink();
        registry.reset();
        registry.configure({ level: 'trace', sinks: [consoleSink] });

        await printer().step('config', () => {
            new Logger('Bot').info('connecting to the database');
            return Promise.resolve();
        });

        expect(consoleSink.records).toEqual([]);
        expect(stdout.text()).toMatch(/│ .*connecting to the database/);
    });

    it('prints a warning from inside a step while the step still runs', async () => {
        const registry = LoggerChannelRegistry.instance;
        registry.reset();
        registry.configure({ level: 'trace', sinks: [new ConsoleSink()] });
        let shownDuringStep = '';

        await printer().step('config', () => {
            new Logger('Bot').warn('cache is stale');
            shownDuringStep = stdout.text();
            return Promise.resolve();
        });

        expect(shownDuringStep).toBe(`  ${WARN_MARK} cache is stale\n`);
        expect(stdout.text()).not.toContain('│');
    });

    it('clears the spinner line before it prints a warning on a terminal', async () => {
        const registry = LoggerChannelRegistry.instance;
        registry.reset();
        registry.configure({ level: 'trace', sinks: [new ConsoleSink()] });
        let raw = '';
        stdout = { ...pipedTerminal(), isTTY: true, write: (chunk) => (raw += String(chunk)).length > 0 };

        await printer().step('config', () => {
            new Logger('Bot').warn('cache is stale');
            return Promise.resolve();
        });

        expect(raw).toContain(`\r\u001B[2K  ${levelMark('warn')} cache is stale\n`);
    });

    it('shows logger output below info under a step only with --verbose', async () => {
        const registry = LoggerChannelRegistry.instance;
        registry.reset();
        registry.configure({ level: 'trace', sinks: [new ConsoleSink()] });
        const warmCache = (): Promise<void> => {
            new Logger('Bot').debug('cache warmed');
            return Promise.resolve();
        };

        await printer().step('config', warmCache);
        expect(stdout.text()).not.toContain('cache warmed');

        await printer(true).step('config', warmCache);
        expect(stdout.text()).toContain('cache warmed');
    });

    it('prints a detail line only under --verbose', () => {
        printer().detail('root', 'src');
        expect(stdout.text()).toBe('');

        printer(true).detail('root', 'src');
        expect(stdout.text()).toBe('      root       src\n');
    });

    it('keeps a space between the value and a key as long as the key column', () => {
        printer(true).detail('cloudflare', 'cloudflare.config.ts');

        expect(stdout.text()).toBe('      cloudflare cloudflare.config.ts\n');
    });

    it('prints a warning with its mark in the step column', async () => {
        const steps = printer();

        await steps.step('config', () => Promise.resolve());
        steps.warn('Could not read 1 guild (Old Server).');

        const [stepRow = '', warning = ''] = stdout.text().split('\n');
        expect(warning).toBe(`  ${WARN_MARK} Could not read 1 guild (Old Server).`);
        expect(warning.indexOf(WARN_MARK)).toBe(stepRow.indexOf(paint.check));
    });

    it('writes a failure to stderr after a blank line', () => {
        printer().fail(new Error('boom'));

        expect(stderr.text()).toMatch(/^\n {2}Error: boom\n/);
    });
});
