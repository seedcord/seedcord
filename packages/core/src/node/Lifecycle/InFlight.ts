import { settleWithin } from '#src/lifecycle/withTimeout';

import type { Logger } from '@seedcord/logger';

export class InFlight {
    private readonly running = new Set<Promise<unknown>>();
    private isClosed = false;

    constructor(
        private readonly logger: Logger,
        private readonly label: string
    ) {}

    public get closed(): boolean {
        return this.isClosed;
    }

    public close(): void {
        this.isClosed = true;
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
