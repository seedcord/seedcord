import { assert, describe, it, expect, vi } from 'vite-plus/test';

import { HmrManager } from '#hmr/HmrManager';
import { fakeCliChannel } from '#tests/utils/fakeCliChannel';

import type { FakeCliChannel } from '#tests/utils/fakeCliChannel';

function listening(): FakeCliChannel & { manager: HmrManager } {
    const cli = fakeCliChannel();
    const manager = HmrManager.listenTo(cli.channel);
    assert(manager);
    return { ...cli, manager };
}

describe('HmrManager', () => {
    it('tells the CLI when vite is about to reload every module', () => {
        const { sent, sends } = listening();
        expect(sent).toEqual([]);

        sends('vite:beforeFullReload');

        expect(sent).toEqual([['seedcord:full-reload', {}]]);
    });

    it('finishes one save before it starts the next', async () => {
        const { manager, sends: cliSends } = listening();
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
        const { manager, sends: cliSends } = listening();
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

    it('tells the CLI once every listener has handled the update', async () => {
        const { manager, sent, sends: cliSends } = listening();
        const { promise: reloaded, resolve: finishReload } = Promise.withResolvers<undefined>();
        const onHmr = vi.fn(() => reloaded);
        manager.register({ onHmr });

        cliSends('seedcord:hmr', { file: 'x.ts', type: 'update' });
        await vi.waitFor(() => expect(onHmr).toHaveBeenCalled());
        expect(sent).toEqual([]);
        finishReload(undefined);

        await vi.waitFor(() => expect(sent).toEqual([['seedcord:hmr-applied', {}]]));
    });
});
