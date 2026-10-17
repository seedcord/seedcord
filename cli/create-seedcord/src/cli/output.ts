import { StepRow } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';

import { banner } from '#cli/banner';
import { messageOf } from '#cli/messageOf';
import { CommandFailed } from '#scaffold/exec';

import type { StepUi } from '#cli/steps';

const SUMMARY_LABELS = ['intents', 'next', 'invite', 'again', 'guide'] as const;

type SummaryLabel = (typeof SUMMARY_LABELS)[number];

function underFailedRow(error: unknown): string[] {
    if (error instanceof CommandFailed) return [paint.mute(error.command), ...error.output];
    return messageOf(error).split('\n');
}

interface Stdout {
    write: (text: string) => unknown;
    isTTY?: boolean;
}

export class CreateOutput {
    private readonly labelWidth: number;

    constructor(
        labels: readonly string[],
        private readonly stdout: Stdout = process.stdout,
        private readonly stderr: Stdout = process.stderr
    ) {
        this.labelWidth = Math.max(...[...labels, ...SUMMARY_LABELS].map((label) => label.length));
    }

    public header(): void {
        this.stdout.write(`\n${banner()}\n\n`);
    }

    public answer(label: string, shown: string): void {
        this.line(`${paint.mint(paint.check)} ${label.padEnd(this.labelWidth)}  ${shown}`);
    }

    public stepRows(): StepUi {
        return {
            run: (label, work) =>
                new StepRow({
                    write: (text) => this.stdout.write(text),
                    label,
                    labelWidth: this.labelWidth,
                    animate: Boolean(this.stdout.isTTY)
                }).run(work, { done: () => ({ lines: [] }), linesUnderFailure: underFailedRow }),
            skip: (label) => this.line(paint.mute(`- ${label.padEnd(this.labelWidth)}  skipped`))
        };
    }

    public plainSteps(): StepUi {
        return {
            run: async (_label, work) => {
                try {
                    return await work();
                } catch (error: unknown) {
                    this.warn(messageOf(error));
                    throw error;
                }
            },
            skip: () => undefined
        };
    }

    public warn(text: string): void {
        const [first, ...rest] = text.split('\n');
        this.line(`${paint.amber('▲')} ${first}`);
        for (const line of rest) this.line(`  ${line}`);
    }

    public row(label: SummaryLabel, lines: readonly string[]): void {
        const blank = ' '.repeat(this.labelWidth);
        for (const [index, line] of lines.entries()) {
            const head = index === 0 ? paint.mute(label.padEnd(this.labelWidth)) : blank;
            this.line(`  ${head}  ${line}`);
        }
    }

    public fail(message: string): void {
        this.stderr.write(`\n  ${paint.coral('⬢')} ${message}\n`);
        this.nothingCreated();
    }

    public nothingCreated(): void {
        this.stderr.write(`  ${paint.mute('Nothing was created.')}\n`);
    }

    public line(text = ''): void {
        this.stdout.write(text === '' ? '\n' : `  ${text}\n`);
    }
}
