import type { CliChannel } from '#hmr/devChannel';

export interface FakeCliChannel {
    readonly channel: CliChannel;
    readonly sent: [event: string, payload: unknown][];
    readonly sends: (event: string, payload?: unknown) => void;
}

export function fakeCliChannel(): FakeCliChannel {
    const listeners = new Map<string, (payload: unknown) => void>();
    const sent: FakeCliChannel['sent'] = [];
    const channel: CliChannel = {
        send: (event, payload) => void sent.push([event, payload]),
        // justified: each listener reads the payload of the event it was registered for
        on: (event, listener) => void listeners.set(event, listener as (payload: unknown) => void),
        off: () => undefined
    };
    return { channel, sent, sends: (event, payload) => listeners.get(event)?.(payload) };
}
