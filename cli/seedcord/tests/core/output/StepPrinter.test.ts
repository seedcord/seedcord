import { stripVTControlCharacters } from 'node:util';

import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { beforeEach, describe, expect, it } from 'vitest';

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

let stdout: FakeTerminal;
let stderr: FakeTerminal;

function printer(verbose = false): StepPrinter<'config' | 'type check'> {
    return new StepPrinter({ command: 'build', labels: ['config', 'type check'], verbose, stdout, stderr });
}

beforeEach(() => {
    stdout = pipedTerminal();
    stderr = pipedTerminal();
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

        expect(stdout.text()).toMatch(/^ {2}✔︎ config {6}\s+\d+ms\n {2}✔︎ type check {2}\s+\d+ms {2}tsconfig\.json\n$/);
    });

    it('marks a failed step with a cross and rethrows', async () => {
        const failure = new Error('tsc crashed');

        await expect(printer().step('type check', () => Promise.reject(failure))).rejects.toBe(failure);
        expect(stdout.text()).toMatch(/^ {2}✘ type check/);
    });

    it('holds what the task writes and prints it under the finished step', async () => {
        await printer().step('config', () => {
            stdout.write('loaded 3 feature flags\n');
            return Promise.resolve();
        });

        const [stepLine, heldLine] = stdout.text().split('\n');
        expect(stepLine).toMatch(/✔︎ config/);
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
        registry.reset();
    });

    it('prints a detail line only under --verbose', () => {
        printer().detail('root', 'src');
        expect(stdout.text()).toBe('');

        printer(true).detail('root', 'src');
        expect(stdout.text()).toBe('      root      src\n');
    });

    it('writes a failure to stderr after a blank line', () => {
        printer().fail(new Error('boom'));

        expect(stderr.text()).toMatch(/^\n {2}Error: boom\n/);
    });
});
