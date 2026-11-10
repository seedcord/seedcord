import type { Cron } from 'croner';

interface CronSettings {
    readonly pattern: string;
    readonly timezone: string | undefined;
    readonly maxRuns: number | undefined;
    readonly pausedByDecorator: boolean;
}

// croner times a run from the last one. A croner job paused through a match would run it the moment it resumes.
// stop() ends the croner job instead, and start() builds a fresh one
export class CronJob {
    private cron: Cron;
    private scheduled = false;
    private runsLeft: number;
    private lastRun: Date | null = null;

    constructor(
        private readonly build: () => Cron,
        private readonly run: (claim: () => boolean) => Promise<void>,
        public readonly settings: CronSettings
    ) {
        this.cron = build();
        this.runsLeft = settings.maxRuns ?? Number.POSITIVE_INFINITY;
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

        // croner runs an interval job from its last run. nextRuns() matches that and nextRun() counts from now
        return this.cron.nextRuns(1)[0] ?? null;
    }

    public previousRun(): Date | null {
        return this.lastRun;
    }

    // TaskRunner.run() calls this as stillWanted, after its protect and shutdown checks pass
    private claim(): boolean {
        if (this.runsLeft === 0) return false;

        this.runsLeft -= 1;
        this.lastRun = new Date();
        if (this.runsLeft === 0) this.stop();

        return true;
    }
}
