import { settleWithin } from '#src/lifecycle/withTimeout';
import { requestScope } from '#src/requestScope';

import type { Logger } from '@seedcord/logger';

export class InFlight {
    private readonly running = new Set<Promise<unknown>>();
    private opening = Promise.withResolvers<boolean>();
    private state: 'held' | 'open' | 'paused' | 'closed' = 'held';

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
        if (this.state === 'open') return this.run(work);
        return this.opening.promise.then((opened) => (opened ? this.run(work) : undefined));
    }

    // a plugin reload calls this so no request or event reaches a plugin that hasn't started yet
    public async pause(timeoutMs: number): Promise<() => void> {
        if (this.state !== 'open') return () => undefined;
        this.state = 'paused';
        this.opening = Promise.withResolvers();
        await settleWithin(this.settleAll(), timeoutMs);
        return () => {
            if (this.state !== 'paused') return;
            this.state = 'open';
            this.opening.resolve(true);
        };
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

    private run<Result>(work: () => Promise<Result>): Promise<Result> {
        // also pass the work to the edge request's waitUntil, or cloudflare stops it after the response
        const outer = requestScope.getStore();
        const running = requestScope.run(
            {
                waitUntil: (kept) => {
                    this.track(kept);
                    outer?.waitUntil(kept);
                }
            },
            work
        );
        this.track(running);
        return running;
    }

    // settling work can track more work
    private async settleAll(): Promise<void> {
        while (this.running.size > 0) await Promise.allSettled(this.running);
    }
}
