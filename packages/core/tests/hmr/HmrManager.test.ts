import { assert, describe, it, expect, vi } from 'vite-plus/test';

import { HmrManager } from '#hmr/HmrManager';

import type { CliChannel } from '#hmr/devChannel';

function listening(): { manager: HmrManager; send: ReturnType<typeof vi.fn>; cliSends: (...args: unknown[]) => void } {
    const listeners = new Map<string, (payload: unknown) => void>();
    const send = vi.fn();
    const channel = {
        send,
        on: (event: string, listener: (payload: unknown) => void) => void listeners.set(event, listener),
        off: vi.fn()
    };
    // justified: listenTo reads only send and on
    const manager = HmrManager.listenTo(channel as unknown as CliChannel);
    assert(manager);
    return { manager, send, cliSends: (event, payload) => listeners.get(String(event))?.(payload) };
}

describe('HmrManager', () => {
    it('tells the CLI when vite is about to reload every module', () => {
        const { send, cliSends } = listening();
        expect(send).not.toHaveBeenCalled();

        cliSends('vite:beforeFullReload');

        expect(send).toHaveBeenCalledExactlyOnceWith('seedcord:full-reload', {});
    });

    it('finishes one save before it starts the next', async () => {
        const { manager, cliSends } = listening();
        const order: string[] = [];
        const { promise: firstImport, resolve: finishFirstImport } = Promise.withResolvers<undefined>();
        manager.register({
            onHmr: async ({ file }) => {
                order.push(`start ${file}`);
                if (file === 'a.ts') await firstImport;
                order.push(`end ${file}`);
            }
        });

        cliSends('seedcord:hmr', { file: 'a.ts', type: 'update' });
        cliSends('seedcord:hmr', { file: 'b.ts', type: 'update' });
        finishFirstImport(undefined);

        await vi.waitFor(() => expect(order).toHaveLength(4));
        expect(order).toEqual(['start a.ts', 'end a.ts', 'start b.ts', 'end b.ts']);
    });

    it('a rejecting listener does not stop the other listeners', async () => {
        const { manager, cliSends } = listening();
        const ran: string[] = [];
        manager.register({ onHmr: () => Promise.reject(new Error('boom')) });
        manager.register({
            onHmr: () => {
                ran.push('ok');
                return Promise.resolve();
            }
        });

        cliSends('seedcord:hmr', { file: 'x.ts', type: 'update' });

        await vi.waitFor(() => expect(ran).toEqual(['ok']));
    });
});
