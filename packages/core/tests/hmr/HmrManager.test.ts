import { describe, it, expect, afterEach } from 'vitest';

import { getDevChannel, setDevChannel } from '#hmr/devChannel';
import { HmrManager } from '#hmr/HmrManager';

describe('HmrManager', () => {
    afterEach(() => {
        setDevChannel(undefined);
    });

    it('init without a vite hot context leaves the dev channel unset', () => {
        new HmrManager().init();

        expect(getDevChannel()).toBeUndefined();
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
