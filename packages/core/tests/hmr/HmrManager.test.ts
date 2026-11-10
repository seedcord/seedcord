import { describe, it, expect, vi } from 'vite-plus/test';

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

    it('finishes one save before it starts the next', async () => {
        const listeners = new Map<string, (payload: unknown) => void>();
        const channel = {
            send: vi.fn(),
            on: (event: string, listener: (payload: unknown) => void) => void listeners.set(event, listener),
            off: vi.fn()
        };
        const manager = new HmrManager();
        // justified: init reads only send and on
        manager.init(channel as unknown as CliChannel);
        const order: string[] = [];
        const { promise: firstImport, resolve: finishFirstImport } = Promise.withResolvers<undefined>();
        manager.register({
            onHmr: async ({ file }) => {
                order.push(`start ${file}`);
                if (file === 'a.ts') await firstImport;
                order.push(`end ${file}`);
            }
        });

        listeners.get('seedcord:hmr')?.({ file: 'a.ts', type: 'update' });
        listeners.get('seedcord:hmr')?.({ file: 'b.ts', type: 'update' });
        finishFirstImport(undefined);

        await vi.waitFor(() => expect(order).toHaveLength(4));
        expect(order).toEqual(['start a.ts', 'end a.ts', 'start b.ts', 'end b.ts']);
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
