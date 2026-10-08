import { Plugin } from '@seedcord/core/plugin';
import { expectTypeOf } from 'vitest';

import type { Seedcord as EdgeSeedcord } from '#src/edge/Seedcord';
import type { Seedcord } from '#src/node/Seedcord';
import type { CoreBase } from '@seedcord/core';

class EdgeOnly extends Plugin<{ runtime: 'edge' }> {
    constructor(host: CoreBase) {
        super(host, { runtime: 'edge' });
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class ServerOnly extends Plugin<{ runtime: 'server' }> {
    constructor(host: CoreBase) {
        super(host, { runtime: 'server' });
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class Anywhere extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class HttpOnly extends Plugin<{ transport: 'http' }> {
    constructor(host: CoreBase) {
        super(host, { transport: 'http' });
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class GatewayOnly extends Plugin<{ transport: 'gateway' }> {
    constructor(host: CoreBase) {
        super(host, { transport: 'gateway' });
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class Store<TValue> extends Plugin {
    public value?: TValue;

    public init(): Promise<void> {
        return Promise.resolve();
    }
}

function probeServerAccepts(bot: Seedcord): void {
    bot.attach('anywhere', Anywhere);
    bot.attach('http', HttpOnly);
    expectTypeOf(bot.attach('store', Store)).toHaveProperty('store').toEqualTypeOf<Store<unknown>>();
}

function probeServerRejects(bot: Seedcord): void {
    // @ts-expect-error GatewayOnly declares transport 'gateway'
    bot.attach('gw', GatewayOnly);
    // @ts-expect-error EdgeOnly declares runtime 'edge'
    bot.attach('edge', EdgeOnly);
}

function probeEdgeAccepts(bot: EdgeSeedcord): void {
    bot.attach('anywhere', Anywhere);
    bot.attach('http', HttpOnly);
    bot.attach('edge', EdgeOnly);
}

function probeEdgeRejects(bot: EdgeSeedcord): void {
    // @ts-expect-error GatewayOnly declares transport 'gateway'
    bot.attach('gw', GatewayOnly);
    // @ts-expect-error ServerOnly declares runtime 'server'
    bot.attach('server', ServerOnly);
}

void probeServerAccepts;
void probeServerRejects;
void probeEdgeAccepts;
void probeEdgeRejects;
