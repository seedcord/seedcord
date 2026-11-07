import type { Cron } from 'croner';

// croner sets a timer once it holds a callback, even while paused, so the job gets its callback on its first start
export class CronJob {
    private scheduled = false;

    constructor(
        private readonly cron: Cron,
        private readonly run: () => Promise<void>,
        public readonly pattern: string,
        public readonly timezone: string | undefined,
        // the decorator's paused option, which applies until pause() or resume() runs
        public readonly pausedByDefault: boolean
    ) {}

    public get active(): boolean {
        return this.cron.isRunning();
    }

    public start(): void {
        if (this.scheduled) {
            this.cron.resume();
            return;
        }

        this.scheduled = true;
        this.cron.schedule(this.run);
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
