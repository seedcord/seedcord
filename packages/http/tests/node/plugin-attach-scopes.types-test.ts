import { Plugin } from '@seedcord/core/plugin';
import { expectTypeOf } from 'vitest';

import type { HttpEdgeConfig, HttpServerConfig } from '#interfaces/Config';
import type { Seedcord } from '#src/node/Seedcord';

class Anywhere extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class HttpOnly extends Plugin<{ transport: 'http' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class GatewayOnly extends Plugin<{ transport: 'gateway' }> {
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

function probeServerAccepts(bot: Seedcord<HttpServerConfig>): void {
    bot.attach('anywhere', Anywhere);
    bot.attach('http', HttpOnly);
    expectTypeOf(bot.attach('store', Store)).toHaveProperty('store').toEqualTypeOf<Store<unknown>>();
}

function probeServerRejects(bot: Seedcord<HttpServerConfig>): void {
    // @ts-expect-error GatewayOnly declares transport 'gateway'
    bot.attach('gw', GatewayOnly);
}

function probeEdgeRejectsEverything(bot: Seedcord<HttpEdgeConfig>): void {
    // @ts-expect-error edge plugins arrive post-v1
    bot.attach('anywhere', Anywhere);
    // @ts-expect-error edge plugins arrive post-v1
    bot.attach('http', HttpOnly);
}

void probeServerAccepts;
void probeServerRejects;
void probeEdgeRejectsEverything;
