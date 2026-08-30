import { randomUUID } from 'node:crypto';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect } from 'vitest';

import { Bus } from '#subscribers/index';

import type { CoreBase } from '#interfaces/CoreBase';

// justified: the Bus only stores core, no member is read during construction
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

describe('the Bus surface a bot author reaches', () => {
    it('names publish and nothing else', () => {
        const bus = stubBus();

        for (const name of ['register', 'unregister', 'registerDefaults', 'verifyWebhooks', 'registeredCount']) {
            expect(name in bus).toBe(false);
        }
        expect(typeof bus.publish).toBe('function');
    });

    it('throws on emit, which would skip every subscriber', () => {
        const bus = stubBus();

        const payload = { uuid: randomUUID(), error: new Error('x'), routeId: 'r' };

        // eslint-disable-next-line @typescript-eslint/no-deprecated --  this pins the deprecation
        expect(() => bus.emit('unknownException', payload)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreBusEmitUnavailable })
        );
    });

    it('keeps the listener methods', () => {
        const bus = stubBus();

        for (const name of ['on', 'once', 'off', 'waitFor']) {
            expect(typeof (bus as unknown as Record<string, unknown>)[name]).toBe('function');
        }
    });
});
