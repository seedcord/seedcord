import { paint } from '@seedcord/errors';

import { formatDuration } from './formatDuration';
import { Spinner } from './Spinner';

interface StepRowOptions {
    readonly write: (text: string) => void;
    readonly label: string;
    readonly labelWidth: number;
    readonly animate: boolean;
}

// six characters fit any time formatDuration writes under 1000s
const TIME_WIDTH = 6;

export class StepRow {
    private startedAt = 0;
    private spinner: Spinner | undefined;

    constructor(private readonly options: StepRowOptions) {}

    public start(): this {
        this.startedAt = performance.now();
        if (this.options.animate) {
            this.spinner = Spinner.start(this.options.write, (frame) => this.line(paint.sky(frame)));
        }
        return this;
    }

    public printAbove(line: string): void {
        if (this.spinner) this.spinner.printAbove(`  ${line}`);
        else this.options.write(`  ${line}\n`);
    }

    public done(lines: readonly string[], note?: string): void {
        this.finish(paint.mint(paint.check), lines, note);
    }

    public failed(lines: readonly string[]): void {
        this.finish(paint.coral(paint.cross), lines);
    }

    private finish(mark: string, lines: readonly string[], note?: string): void {
        this.spinner?.stop();
        this.options.write(`${this.line(mark, note)}\n`);
        for (const line of lines) this.options.write(`      ${paint.mute('│')} ${line}\n`);
    }

    private line(mark: string, note?: string): string {
        const { label, labelWidth } = this.options;
        const time = paint.mute(formatDuration(performance.now() - this.startedAt).padStart(TIME_WIDTH));
        const tail = note ? `  ${note}` : '';
        return `  ${mark} ${label.padEnd(labelWidth)}  ${time}${tail}`;
    }
}
