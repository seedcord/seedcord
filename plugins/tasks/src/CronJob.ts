import type { Cron } from 'croner';

// croner's resume() runs a match that it missed while paused. Pausing calls stop() instead, and resuming builds a new croner job
export class CronJob {
    private cron: Cron;
    private scheduled = false;
    private runsLeft: number;
    private lastRun: Date | null = null;

    constructor(
        private readonly build: () => Cron,
        private readonly run: (claim: () => boolean) => Promise<void>,
        maxRuns: number | undefined
    ) {
        this.cron = build();
        this.runsLeft = maxRuns ?? Number.POSITIVE_INFINITY;
    }

    public get active(): boolean {
        return this.cron.isRunning();
    }

    public start(): void {
        if (this.scheduled || this.runsLeft === 0) return;

        if (this.cron.isStopped()) this.cron = this.build();

        this.cron.schedule(() => this.run(() => this.claim()));
        this.scheduled = true;
    }

    public stop(): void {
        this.scheduled = false;
        this.cron.stop();
    }

    public nextRun(): Date | null {
        if (!this.cron.options.interval) return this.cron.nextRun();

        // with an interval, croner's nextRun() counts from now. nextRuns() counts from the last run, like croner's timer
        return this.cron.nextRuns(1)[0] ?? null;
    }

    public previousRun(): Date | null {
        return this.lastRun;
    }

    private claim(): boolean {
        if (this.runsLeft === 0) return false;

        this.runsLeft -= 1;
        this.lastRun = new Date();
        if (this.runsLeft === 0) this.stop();

        return true;
    }
}
