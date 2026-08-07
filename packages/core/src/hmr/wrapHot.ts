import type { DevChannel } from '@seedcord/types/internal';

// the minimal raw-hot shape, satisfied by both vite's `import.meta.hot` and the CLI's `NormalizedHotChannel`.
interface RawHot {
    send(event: string, data?: unknown): void;
    on(event: string, cb: (data: unknown) => void): void;
}

/** @internal */
export function wrapHot<TSend, TRecv>(hot: RawHot): DevChannel<TSend, TRecv> {
    return {
        send: (event, data) => hot.send(event, data),
        // justified: RawHot types every payload as unknown, and the wire contract guarantees it matches TRecv[Key]
        on: (event, cb) => hot.on(event, cb as (data: unknown) => void)
    };
}
