// miniflare's exit hook calls process.exit from a listener on each of these. dev's quit disposes miniflare itself
const OWNED_SIGNALS = new Set<string | symbol>(['SIGINT', 'SIGTERM', 'SIGHUP']);

type Listener = (...args: unknown[]) => void;

// a second signal falls through to node's default exit
export class DevSignals implements Disposable {
    private constructor(private readonly onSignal: () => void) {}

    public static own(onSignal: () => void): DevSignals {
        const signals = new DevSignals(onSignal);
        for (const signal of OWNED_SIGNALS) process.once(signal, onSignal);
        process.on('newListener', signals.fence);
        return signals;
    }

    // node adds the listener after newListener fires
    private readonly fence = (event: string | symbol, listener: Listener): void => {
        if (OWNED_SIGNALS.has(event)) queueMicrotask(() => process.off(event, listener));
    };

    public [Symbol.dispose](): void {
        process.off('newListener', this.fence);
        for (const signal of OWNED_SIGNALS) process.off(signal, this.onSignal);
    }
}
