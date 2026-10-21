import { DEV_SIGNALS } from '#commands/dev/DevSignals';

// miniflare's exit hook calls process.exit from its SIGINT and SIGTERM listeners. dev's quit disposes miniflare itself
const FENCED_SIGNALS = new Set<string | symbol>(DEV_SIGNALS);

type Listener = (...args: unknown[]) => void;

// removes each listener added for those signals until disposed
export function fenceSignals(): Disposable {
    const remove = (event: string | symbol, listener: Listener): void => {
        // node adds the listener after newListener fires
        if (FENCED_SIGNALS.has(event)) queueMicrotask(() => process.off(event, listener));
    };
    process.on('newListener', remove);
    return { [Symbol.dispose]: () => process.off('newListener', remove) };
}
