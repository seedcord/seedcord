import { describe, expect, it } from 'vitest';

import { listenHostFor } from '#commands/dev/tunnel/listenHost';

describe('listenHostFor', () => {
    it('keeps a quick tunnel on loopback, where cloudflared dials', () => {
        expect(listenHostFor({ mode: 'quick' })).toBe('127.0.0.1');
    });

    it.each([{ mode: 'url', url: 'https://bot.example.com' }, { mode: 'off' }] as const)(
        'binds every address for tunnel mode $mode',
        (tunnel) => {
            expect(listenHostFor(tunnel)).toBeUndefined();
        }
    );
});
