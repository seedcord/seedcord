import { Logger } from '@seedcord/logger';
import { describe, it, expect } from 'vitest';

import { Plugin } from '@src/plugin';

import type { Core } from '@interfaces/Core';
import type { CoreBase } from '@seedcord/core';

// justified: the test only reads the members it declares
const core = { bot: { client: { token: 'seed' } } } as unknown as Core;

class GatewayScoped extends Plugin<{ transport: 'gateway' }> {
    public logger = new Logger('GatewayScoped');
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
    public logger = new Logger('WrongTransport');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class Portable extends Plugin<{ transport: 'any' }> {
    public logger = new Logger('Portable');
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

describe('the gateway plugin base', () => {
    it('binds this.core to the gateway Core', () => {
        const plugin = new GatewayScoped(core);

        expect(plugin.peek()).toBe(core);
        expect(plugin.readBot()).toBe('seed');
    });

    it('accepts a plugin declaring any transport', () => {
        const plugin = new Portable(core);

        expect(plugin).toBeInstanceOf(Plugin);
    });

    it('keeps WrongTransport referenced so its directive stays consumed', () => {
        expect(typeof WrongTransport).toBe('function');
    });
});
