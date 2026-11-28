import { Plugin } from '@seedcord/core/plugin';
import { expectTypeOf } from 'vite-plus/test';

import type { Seedcord as EdgeSeedcord } from '#src/edge/Seedcord';
import type { Seedcord } from '#src/node/Seedcord';
import type { CoreBase } from '@seedcord/core';

class EdgeOnly extends Plugin<{ runtime: 'edge' }> {
    constructor(host: CoreBase) {
        super(host, { runtime: 'edge' });
    }
}

class ServerOnly extends Plugin<{ runtime: 'server' }> {
    constructor(host: CoreBase) {
        super(host, { runtime: 'server' });
    }
}

class Anywhere extends Plugin {}

class HttpOnly extends Plugin<{ transport: 'http' }> {
    constructor(host: CoreBase) {
        super(host, { transport: 'http' });
    }
}

class GatewayOnly extends Plugin<{ transport: 'gateway' }> {
    constructor(host: CoreBase) {
        super(host, { transport: 'gateway' });
    }
}

class Store<TValue> extends Plugin {
    public value?: TValue;
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
    bot.attach('serverOnly', ServerOnly);
}

void probeServerAccepts;
void probeServerRejects;
void probeEdgeAccepts;
void probeEdgeRejects;
