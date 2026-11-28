import { Plugin } from '@seedcord/core/plugin';
import { expectTypeOf } from 'vite-plus/test';

import type { Seedcord } from '#src/Seedcord';
import type { CoreBase } from '@seedcord/core';

class Anywhere extends Plugin {}

class GatewayOnly extends Plugin<{ transport: 'gateway' }> {
    constructor(host: CoreBase) {
        super(host, { transport: 'gateway' });
    }
}

class HttpOnly extends Plugin<{ transport: 'http' }> {
    constructor(host: CoreBase) {
        super(host, { transport: 'http' });
    }
}

class EdgeOnly extends Plugin<{ runtime: 'edge' }> {
    constructor(host: CoreBase) {
        super(host, { runtime: 'edge' });
    }
}

class Store<TValue> extends Plugin {
    public value?: TValue;
}

// compile-only. tc is the assertion, and an unused @ts-expect-error fails it.
function probeAccepts(bot: Seedcord): void {
    bot.attach('anywhere', Anywhere);
    bot.attach('gw', GatewayOnly);
    expectTypeOf(bot.attach('store', Store)).toHaveProperty('store').toEqualTypeOf<Store<unknown>>();
}

function probeRejects(bot: Seedcord): void {
    // @ts-expect-error HttpOnly declares transport 'http'
    bot.attach('http', HttpOnly);
    // @ts-expect-error EdgeOnly declares runtime 'edge', a gateway bot is always server
    bot.attach('edge', EdgeOnly);
}

void probeAccepts;
void probeRejects;
