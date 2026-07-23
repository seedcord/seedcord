import { describe, it, expect, afterEach } from 'vitest';

import { getDevChannel, setDevChannel } from '@hmr/devChannel';
import { HmrManager } from '@hmr/HmrManager';

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

        // @ts-expect-error dispatch is private, the public path needs a vite hot context
        await manager.handleUpdate({ file: 'x.ts', type: 'update' });

        expect(ran).toEqual(['ok']);
    });

    it('an unregistered listener no longer receives updates', async () => {
        const manager = new HmrManager();
        const ran: string[] = [];
        const listener = {
            onHmr: (): Promise<void> => {
                ran.push('gone');
                return Promise.resolve();
            }
        };
        manager.register(listener);
        manager.unregister(listener);

        // @ts-expect-error dispatch is private, the public path needs a vite hot context
        await manager.handleUpdate({ file: 'x.ts', type: 'update' });

        expect(ran).toEqual([]);
    });
});
