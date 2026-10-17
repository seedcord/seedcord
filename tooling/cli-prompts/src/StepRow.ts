import { paint } from '@seedcord/errors';

import { formatDuration } from './formatDuration';
import { Spinner } from './Spinner';

interface StepRowOptions {
    readonly write: (text: string) => void;
    readonly label: string;
    readonly labelWidth: number;
    readonly animate: boolean;
}

interface StepEnd {
    readonly lines: readonly string[];
    readonly note?: string | undefined;
}

interface StepEnding<Result> {
    readonly done: (result: Result) => StepEnd;
    readonly linesUnderFailure: (error: unknown) => readonly string[];
}

// six characters fit any time formatDuration writes under 1000s
const TIME_WIDTH = 6;

export class StepRow {
    private startedAt = 0;
    private spinner: Spinner | undefined;

    constructor(private readonly options: StepRowOptions) {}

    public async run<Result>(task: () => Promise<Result>, ending: StepEnding<Result>): Promise<Result> {
        this.start();

        let result: Result;
        try {
            result = await task();
        } catch (error: unknown) {
            this.finish(paint.coral(paint.cross), ending.linesUnderFailure(error));
            throw error;
        }

        let end: StepEnd;
        try {
            end = ending.done(result);
        } catch (error: unknown) {
            this.spinner?.stop();
            throw error;
        }

        this.finish(paint.mint(paint.check), end.lines, end.note);
        return result;
    }

    public printAbove(line: string): void {
        if (this.spinner) this.spinner.printAbove(`  ${line}`);
        else this.options.write(`  ${line}\n`);
    }

    private start(): void {
        this.startedAt = performance.now();
        if (this.options.animate) {
            this.spinner = Spinner.start(this.options.write, (frame) => this.line(paint.sky(frame)));
        }
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
