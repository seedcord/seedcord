interface ThrottleWindow {
    lastSentAt: number;
    suppressedSinceSend: number;
}

export class ReportThrottle {
    private static readonly perCore = new WeakMap<object, ReportThrottle>();

    public static for(core: object): ReportThrottle {
        let throttle = ReportThrottle.perCore.get(core);
        if (!throttle) {
            throttle = new ReportThrottle();
            ReportThrottle.perCore.set(core, throttle);
        }
        return throttle;
    }

    private readonly windows = new Map<string, ThrottleWindow>();

    constructor(
        private readonly windowMs = 60_000,
        private readonly now: () => number = () => Date.now()
    ) {}

    // null while the window is open, otherwise how many were dropped since the last send
    public take(key: string): number | null {
        const window = this.windows.get(key);
        if (window && this.now() - window.lastSentAt < this.windowMs) {
            window.suppressedSinceSend += 1;
            return null;
        }

        const suppressed = window?.suppressedSinceSend ?? 0;
        this.windows.set(key, { lastSentAt: this.now(), suppressedSinceSend: 0 });
        return suppressed;
    }

    // gives a failed send's count to the open window, plus the one card that never went out
    public restore(key: string, suppressed: number): void {
        const window = this.windows.get(key);
        if (window) window.suppressedSinceSend += suppressed + 1;
    }
}
