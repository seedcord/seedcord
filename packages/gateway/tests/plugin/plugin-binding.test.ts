import { describe, it, expect } from 'vitest';

import { Plugin } from '#src/plugin';

import type { Core } from '#interfaces/Core';
import type { CoreBase } from '@seedcord/core';

// justified: the test only reads the members it declares
const core = { bot: { client: { token: 'seed' } } } as unknown as Core;

class GatewayScoped extends Plugin<{ transport: 'gateway' }> {
    constructor(host: CoreBase) {
        super(host);
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
    // annotated to the gateway Core, which fails to compile when the base binds CoreBase
    public peek(): Core {
        return this.core;
    }
    public readBot(): string | null {
        return this.core.bot.client.token;
    }
}

// @ts-expect-error the gateway base rejects a plugin declaring the other transport
class WrongTransport extends Plugin<{ transport: 'http' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}
void WrongTransport;

// the gateway base accepts a plugin declaring any transport
class Portable extends Plugin<{ transport: 'any' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}
void Portable;

describe('the gateway plugin base', () => {
    it('binds this.core to the gateway Core', () => {
        const plugin = new GatewayScoped(core);

        expect(plugin.peek()).toBe(core);
        expect(plugin.readBot()).toBe('seed');
    });
});
