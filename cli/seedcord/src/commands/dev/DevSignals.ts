export const DEV_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

// a second signal falls through to node's default exit
export class DevSignals implements Disposable {
    private constructor(private readonly onSignal: () => void) {}

    public static own(onSignal: () => void): DevSignals {
        const signals = new DevSignals(onSignal);
        for (const signal of DEV_SIGNALS) process.on(signal, signals.handle);
        return signals;
    }

    private readonly handle = (): void => {
        this[Symbol.dispose]();
        this.onSignal();
    };

    public [Symbol.dispose](): void {
        for (const signal of DEV_SIGNALS) process.off(signal, this.handle);
    }
}
