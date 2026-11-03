import { settleWithin } from '#src/lifecycle/withTimeout';

import type { Logger } from '@seedcord/logger';

export class InFlight {
    private readonly running = new Set<Promise<unknown>>();
    private readonly opening = Promise.withResolvers<boolean>();
    private state: 'held' | 'open' | 'closed' = 'held';

    constructor(
        private readonly logger: Logger,
        private readonly label: string
    ) {}

    public get closed(): boolean {
        return this.state === 'closed';
    }

    public open(): void {
        if (this.state !== 'held') return;
        this.state = 'open';
        this.opening.resolve(true);
    }

    public close(): void {
        this.state = 'closed';
        this.opening.resolve(false);
    }

    public admit<Result>(work: () => Promise<Result>): Promise<Result | undefined> {
        if (this.state === 'closed') return Promise.resolve(undefined);
        const admitted =
            this.state === 'open' ? work() : this.opening.promise.then((opened) => (opened ? work() : undefined));
        this.track(admitted);
        return admitted;
    }

    public track(work: Promise<unknown>): void {
        this.running.add(work);
        const forget = (): void => {
            this.running.delete(work);
        };
        void work.then(forget, forget);
    }

    public async drain(timeoutMs: number): Promise<void> {
        await settleWithin(this.settleAll(), timeoutMs);
        // nothing cancels these before the process exits
        if (this.running.size > 0) {
            this.logger.warn(`${this.label}: ${String(this.running.size)} still running when the drain window closed`);
        }
    }

    // settling work can track more work
    private async settleAll(): Promise<void> {
        while (this.running.size > 0) await Promise.allSettled(this.running);
    }
}
