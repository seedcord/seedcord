import { paint } from '@seedcord/errors';
import { WORDMARK } from '@seedcord/errors/internal';

import { formatDuration } from '#core/format';
import { version } from '#core/version';

import { holdOutput } from './holdOutput';
import { renderError } from './renderError';
import { Spinner } from './Spinner';
import { widthOf } from './terminal';

import type { HeldOutput } from './holdOutput';
import type { Steps } from './Steps';
import type { Terminal } from './terminal';

interface StepPrinterOptions<Label extends string> {
    command: string;
    labels: readonly Label[];
    verbose: boolean;
    stdout?: Terminal;
    stderr?: Terminal;
}

// fits "999ms" and "12.3s" right-aligned
const TIME_WIDTH = 6;
const DETAIL_KEY_WIDTH = 10;

export class StepPrinter<Label extends string> implements Steps<Label> {
    private readonly command: string;
    private readonly labelWidth: number;
    private readonly verbose: boolean;
    private readonly stdout: Terminal;
    private readonly stderr: Terminal;

    constructor({
        command,
        labels,
        verbose,
        stdout = process.stdout,
        stderr = process.stderr
    }: StepPrinterOptions<Label>) {
        this.command = command;
        this.labelWidth = Math.max(...labels.map((label) => label.length));
        this.verbose = verbose;
        this.stdout = stdout;
        this.stderr = stderr;
    }

    public header(): void {
        this.stdout.write(`\n${WORDMARK} ${paint.mute(`v${version}`)}  ${this.command}\n\n`);
    }

    public async step<Result>(
        label: Label,
        task: () => Promise<Result>,
        note?: (result: Result) => string
    ): Promise<Result> {
        const startedAt = performance.now();
        const held = holdOutput(this.stdout, this.stderr, this.verbose);
        const spinner = this.stdout.isTTY
            ? Spinner.start(held.write, (frame) => this.row(paint.sky(frame), label, startedAt))
            : undefined;

        const finish = (mark: string, extra?: string): void => {
            spinner?.stop();
            this.printFinished(held, this.row(mark, label, startedAt, extra));
        };

        try {
            const result = await task();
            finish(paint.mint(paint.check), note?.(result));
            return result;
        } catch (error: unknown) {
            finish(paint.coral(paint.cross));
            throw error;
        }
    }

    public detail(key: string, value: string): void {
        if (this.verbose) this.stdout.write(`      ${paint.mute(key.padEnd(DETAIL_KEY_WIDTH))}${value}\n`);
    }

    public line(text = ''): void {
        this.stdout.write(text === '' ? '\n' : `  ${text}\n`);
    }

    public fail(error: unknown): void {
        this.stderr.write(`\n${renderError(error, { verbose: this.verbose, width: widthOf(this.stderr) })}\n`);
    }

    private row(mark: string, label: Label, startedAt: number, note?: string): string {
        const time = paint.mute(formatDuration(performance.now() - startedAt).padStart(TIME_WIDTH));
        const tail = note ? `  ${note}` : '';
        return `  ${mark} ${label.padEnd(this.labelWidth)}  ${time}${tail}`;
    }

    private printFinished(held: HeldOutput, row: string): void {
        const heldLines = held.release();
        this.stdout.write(`${row}\n`);
        for (const line of heldLines) this.stdout.write(`      ${paint.mute('│')} ${line}\n`);
    }
}
