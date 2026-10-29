import { StepRow } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';
import { WORDMARK } from '@seedcord/errors/internal';

import { version } from '#core/version';

import { holdOutput } from './holdOutput';
import { levelMark } from './levelMark';
import { renderError } from './renderError';
import { widthOf } from './terminal';
import { wrapLines } from './wrapLines';

import type { Steps } from './Steps';
import type { Terminal } from './terminal';
import type { LinePrefix } from './wrapLines';

interface StepPrinterOptions<Label extends string> {
    command: string;
    labels: readonly Label[];
    verbose: boolean;
    stdout?: Terminal;
    stderr?: Terminal;
}

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
        note?: (result: Result) => string,
        lines?: (result: Result) => readonly string[]
    ): Promise<Result> {
        // bound before holdOutput swaps stdout.write for its own
        const write = this.stdout.write.bind(this.stdout);
        const row = new StepRow({ write, label, labelWidth: this.labelWidth, animate: Boolean(this.stdout.isTTY) });
        const held = holdOutput(this.stdout, this.stderr, this.verbose, (line) => row.printAbove(line));

        return row.run(task, {
            done: (result) => ({ lines: [...held.release(), ...(lines?.(result) ?? [])], note: note?.(result) }),
            linesUnderFailure: () => held.release()
        });
    }

    public detail(key: string, value: string): void {
        if (this.verbose) this.stdout.write(`      ${paint.mute(key.padEnd(DETAIL_KEY_WIDTH))} ${value}\n`);
    }

    public warn(text: string): void {
        this.stdout.write(`  ${levelMark('warn')} ${text}\n`);
    }

    public line(text = ''): void {
        this.stdout.write(text === '' ? '\n' : `  ${text}\n`);
    }

    // piped output stays on one line
    public wrapped(text: string, { first, rest }: LinePrefix): void {
        this.stdout.write(wrapLines(text, widthOf(this.stdout), { first: `  ${first}`, rest: `  ${rest}` }));
    }

    public fail(error: unknown): void {
        this.stderr.write(`\n${renderError(error, { verbose: this.verbose, width: widthOf(this.stderr) })}\n`);
    }
}
