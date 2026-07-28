/**
 * Drops duplicate fault reports inside a fixed window, so a recurring fault (a database outage on a
 * hot path) reports once per window and never floods the webhook.
 *
 * @internal
 */
export class FaultThrottle {
    private readonly lastReportedAt = new Map<string, number>();

    constructor(
        private readonly windowMs = 60_000,
        private readonly now: () => number = () => Date.now()
    ) {}

    /** Evicts the entry for this key if it has aged out. */
    public shouldReport(key: string): boolean {
        const last = this.lastReportedAt.get(key);
        if (last === undefined) return true;
        if (this.now() - last < this.windowMs) return false;

        this.lastReportedAt.delete(key);
        return true;
    }

    public markReported(key: string): void {
        this.lastReportedAt.set(key, this.now());
    }

    public clear(): void {
        this.lastReportedAt.clear();
    }
}
