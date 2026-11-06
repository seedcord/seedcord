import { describe, it, expect, vi } from 'vitest';

import { HmrManager } from '#hmr/HmrManager';

import type { CliChannel } from '#hmr/devChannel';

describe('HmrManager', () => {
    it('tells the CLI when vite is about to reload every module', () => {
        const listeners = new Map<string, () => void>();
        const send = vi.fn();
        const channel = {
            send,
            on: (event: string, listener: () => void) => void listeners.set(event, listener),
            off: vi.fn()
        };

        // justified: init reads only send and on
        new HmrManager().init(channel as unknown as CliChannel);
        expect(send).not.toHaveBeenCalled();

        listeners.get('vite:beforeFullReload')?.();

        expect(send).toHaveBeenCalledExactlyOnceWith('seedcord:full-reload', {});
    });

    it('a rejecting listener does not stop the other listeners', async () => {
        const manager = new HmrManager();
        const ran: string[] = [];
        manager.register({ onHmr: () => Promise.reject(new Error('boom')) });
        manager.register({
            onHmr: () => {
                ran.push('ok');
                return Promise.resolve();
            }
        });

        // @ts-expect-error handleUpdate is private, the public path needs a vite hot context
        await manager.handleUpdate({ file: 'x.ts', type: 'update' });

        expect(ran).toEqual(['ok']);
    });
});
