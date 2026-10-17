import { StepRow } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';

import { banner } from '#cli/banner';

import type { StepUi } from '#cli/steps';

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
        this.labelWidth = Math.max(...labels.map((label) => label.length));
    }

    public header(): void {
        this.stdout.write(`\n${banner()}\n\n`);
    }

    public answer(label: string, shown: string): void {
        this.line(`${paint.mint(paint.check)} ${label.padEnd(this.labelWidth)}  ${shown}`);
    }

    public steps(): StepUi {
        return {
            run: async (label, work) => {
                const row = new StepRow({
                    write: (text) => this.stdout.write(text),
                    label,
                    labelWidth: this.labelWidth,
                    animate: Boolean(this.stdout.isTTY)
                }).start();

                try {
                    const result = await work();
                    row.done([]);
                    return result;
                } catch (error: unknown) {
                    row.failed([]);
                    throw error;
                }
            },
            skip: (label) => this.line(paint.mute(`- ${label.padEnd(this.labelWidth)}  skipped`))
        };
    }

    public warn(text: string): void {
        const [first, ...rest] = text.split('\n');
        this.line(`${paint.amber('▲')} ${first}`);
        for (const line of rest) this.line(`  ${line}`);
    }

    public note(title: string, lines: readonly string[]): void {
        this.line();
        this.line(paint.bold(title));
        for (const line of lines) this.line(line === '' ? '' : `  ${line}`);
    }

    // an indent would end up in whatever gets pasted
    public copyable(label: string, value: string): void {
        this.line();
        this.line(paint.mute(label));
        this.stdout.write(`${value}\n`);
    }

    public fail(message: string): void {
        this.stderr.write(`\n  ${paint.coral('⬢')} ${message}\n  ${paint.mute('Nothing was created.')}\n`);
    }

    public line(text = ''): void {
        this.stdout.write(text === '' ? '\n' : `  ${text}\n`);
    }
}
