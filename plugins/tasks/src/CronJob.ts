import type { Cron } from 'croner';

// croner sets a timer once it holds a callback, even while paused, so the job hands over its callback the first time it runs
export class CronJob {
    private scheduled = false;

    constructor(
        private readonly cron: Cron,
        private readonly run: () => Promise<void>,
        public readonly pattern: string,
        public readonly timezone: string | undefined,
        public readonly pausedByDecorator: boolean
    ) {}

    public get active(): boolean {
        return this.cron.isRunning();
    }

    public start(): void {
        if (!this.scheduled) {
            this.scheduled = true;
            this.cron.schedule(this.run);
        }
        this.cron.resume();
    }

    public pause(): void {
        this.cron.pause();
    }

    public stop(): void {
        this.cron.stop();
    }

    public nextRun(): Date | null {
        return this.cron.nextRun();
    }

    public previousRun(): Date | null {
        return this.cron.previousRun();
    }
}
