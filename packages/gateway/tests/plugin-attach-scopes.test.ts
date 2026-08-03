import { Plugin } from '@seedcord/core/plugin';
import { describe, it, expect } from 'vitest';

import type { Seedcord } from '@src/Seedcord';

class Anywhere extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class GatewayOnly extends Plugin<{ transport: 'gateway' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class HttpOnly extends Plugin<{ transport: 'http' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class EdgeOnly extends Plugin<{ runtime: 'edge' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

// compile-only. tc is the assertion, and an unused @ts-expect-error fails it.
function probeAccepts(bot: Seedcord): void {
    bot.attach('anywhere', Anywhere);
    bot.attach('gw', GatewayOnly);
}

function probeRejects(bot: Seedcord): void {
    // @ts-expect-error HttpOnly declares transport 'http'
    bot.attach('http', HttpOnly);
    // @ts-expect-error EdgeOnly declares runtime 'edge', a gateway bot is always server
    bot.attach('edge', EdgeOnly);
}

describe('gateway attach scopes', () => {
    it('pins the host to the gateway transport and the server runtime', () => {
        expect([probeAccepts, probeRejects]).toHaveLength(2);
    });
});
