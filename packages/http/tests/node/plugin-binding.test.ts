import { describe, it, expect } from 'vitest';

import { Plugin } from '#src/plugin';

import type { Core } from '#interfaces/Core';
import type { CoreBase } from '@seedcord/core';

// justified: the test only reads the members it declares
const core = { rest: { options: {} } } as unknown as Core;

class HttpScoped extends Plugin<{ transport: 'http' }> {
    constructor(host: CoreBase) {
        super(host);
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
    // annotated to the http Core, which fails to compile when the base binds CoreBase
    public peek(): Core {
        return this.core;
    }
    public readRest(): unknown {
        return this.core.rest.options;
    }
}

// @ts-expect-error the http base rejects a plugin declaring the other transport
class WrongTransport extends Plugin<{ transport: 'gateway' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}
void WrongTransport;

// the http base accepts a plugin declaring any transport
class Portable extends Plugin<{ transport: 'any' }> {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}
void Portable;

describe('the http plugin base', () => {
    it('binds this.core to the http Core', () => {
        const plugin = new HttpScoped(core);

        expect(plugin.peek()).toBe(core);
        expect(plugin.readRest()).toBe(core.rest.options);
    });
});
