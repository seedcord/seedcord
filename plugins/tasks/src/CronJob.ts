import type { Cron } from 'croner';

/** Builds the croner job for a task, with `maxRuns` in place of the task's own. */
export type BuildCron = (maxRuns?: number) => Cron;

// croner times a run from the last one, so a croner job paused through a match runs it at once on resume.
// stop() ends the croner job instead, and start() builds a fresh one with the runs it had left
export class CronJob {
    private cron: Cron;
    private scheduled = false;
    private earlierRun: Date | null = null;

    constructor(
        private readonly build: BuildCron,
        private readonly run: () => Promise<void>,
        public readonly pattern: string,
        public readonly timezone: string | undefined,
        public readonly pausedByDecorator: boolean
    ) {
        this.cron = build();
    }

    public get active(): boolean {
        return this.cron.isRunning();
    }

    public start(): void {
        if (this.scheduled) return;

        if (this.cron.isStopped()) {
            const runsLeft = this.cron.runsLeft();
            if (runsLeft === 0) return;

            this.earlierRun = this.previousRun();
            this.cron = this.build(runsLeft);
        }

        this.cron.schedule(this.run);
        this.scheduled = true;
    }

    public stop(): void {
        this.scheduled = false;
        this.cron.stop();
    }

    public nextRun(): Date | null {
        if (!this.cron.options.interval) return this.cron.nextRun();

        // croner's nextRun() counts an interval from now, but croner times the run from the last one, as nextRuns() does
        return this.cron.nextRuns(1)[0] ?? null;
    }

    public previousRun(): Date | null {
        return this.cron.previousRun() ?? this.earlierRun;
    }
}
