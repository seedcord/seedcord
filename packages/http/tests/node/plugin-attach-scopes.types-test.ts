import { Plugin } from '@seedcord/core/plugin';
import { expectTypeOf } from 'vitest';

import type { Seedcord } from '#src/node/Seedcord';
import type { CoreBase } from '@seedcord/core';

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
}

void probeServerAccepts;
void probeServerRejects;
