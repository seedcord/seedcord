import { Plugin } from '@seedcord/core/plugin';
import { Logger } from '@seedcord/logger';
import { describe, it, expect } from 'vitest';

import type { HttpEdgeConfig, HttpServerConfig } from '@interfaces/Config';
import type { Seedcord } from '@src/node/Seedcord';

class Anywhere extends Plugin {
    public logger = new Logger('Anywhere');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class HttpOnly extends Plugin<{ transport: 'http' }> {
    public logger = new Logger('HttpOnly');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class GatewayOnly extends Plugin<{ transport: 'gateway' }> {
    public logger = new Logger('GatewayOnly');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

function probeServerAccepts(bot: Seedcord<HttpServerConfig>): void {
    bot.attach('anywhere', Anywhere);
    bot.attach('http', HttpOnly);
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

describe('http attach scopes', () => {
    it('reads the runtime off the config literal the host is constructed with', () => {
        expect([probeServerAccepts, probeServerRejects, probeEdgeRejectsEverything]).toHaveLength(3);
    });
});
