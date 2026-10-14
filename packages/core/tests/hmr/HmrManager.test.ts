import { describe, it, expect } from 'vitest';

import { HmrManager } from '#hmr/HmrManager';

describe('HmrManager', () => {
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
