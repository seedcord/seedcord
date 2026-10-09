import { Plugin, Seedcord } from '@seedcord/http';
import { env } from 'cloudflare:workers';

import type { CoreBase } from '@seedcord/http';

class EdgeCounter extends Plugin<{ runtime: 'edge' }> {
    public readonly binding = env.COUNTER_BINDING;

    constructor(host: CoreBase) {
        super(host, { runtime: 'edge' });
    }

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

export default new Seedcord({
    bot: { interactions: { path: null }, commands: { path: null } },
    subscribers: { path: null }
}).attach('counter', EdgeCounter);
