/** @internal */
export class FaultThrottle {
    // keyed by core so each bot gets its own window, and the entry is collected with the core
    private static readonly perCore = new WeakMap<object, FaultThrottle>();

    /** @internal */
    public static for(core: object): FaultThrottle {
        let throttle = FaultThrottle.perCore.get(core);
        if (!throttle) {
            throttle = new FaultThrottle();
            FaultThrottle.perCore.set(core, throttle);
        }
        return throttle;
    }

    private readonly lastReportedAt = new Map<string, number>();

    constructor(
        private readonly windowMs = 60_000,
        private readonly now: () => number = () => Date.now()
    ) {}

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
