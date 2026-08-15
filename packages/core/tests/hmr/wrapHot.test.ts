import { describe, it, expect, vi } from 'vitest';

import { wrapHot } from '#hmr/wrapHot';

import type { SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';

describe('wrapHot', () => {
    it('delegates send to the raw hot with the event and payload', () => {
        const send = vi.fn();
        const channel = wrapHot<SeedcordFrameworkEvents, SeedcordCliEvents>({ send, on: vi.fn() });

        channel.send('seedcord:register-critical-files', { patterns: ['migrations/*'] });

        expect(send).toHaveBeenCalledWith('seedcord:register-critical-files', { patterns: ['migrations/*'] });
    });

    it('delegates on to the raw hot and forwards the payload to the callback', () => {
        let registered: ((data: unknown) => void) | undefined;
        const on = vi.fn((_event: string, cb: (data: unknown) => void) => {
            registered = cb;
        });
        const channel = wrapHot<SeedcordFrameworkEvents, SeedcordCliEvents>({ send: vi.fn(), on });

        const received: string[] = [];
        channel.on('seedcord:hmr', (payload) => received.push(payload.file));

        expect(on).toHaveBeenCalledWith('seedcord:hmr', expect.any(Function));
        registered?.({ file: 'x.ts', type: 'update' });
        expect(received).toEqual(['x.ts']);
    });

    it('types the wire, so a wrong payload or direction is a compile error', () => {
        const channel = wrapHot<SeedcordFrameworkEvents, SeedcordCliEvents>({ send: vi.fn(), on: vi.fn() });

        channel.send('seedcord:register-critical-files', { patterns: ['x'] });
        // @ts-expect-error wrong payload field type
        channel.send('seedcord:register-critical-files', { patterns: 123 });
        // @ts-expect-error wrong direction, seedcord:hmr is a receive event
        channel.send('seedcord:hmr', { file: 'x', type: 'update' });
        // @ts-expect-error unknown event name
        channel.on('seedcord:nope', () => undefined);

        expect(channel).toBeDefined();
    });
});
