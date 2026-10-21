import { describe, expect, it } from 'vitest';

import { createTunnelCoordinator, missingCloudflaredHint } from '#commands/dev/tunnel/createTunnelCoordinator';
import { TunnelCoordinator } from '#commands/dev/tunnel/TunnelCoordinator';
import { silentLogger } from '#tests/silentLogger';

describe('createTunnelCoordinator', () => {
    it('builds nothing when the tunnel is off', () => {
        expect(createTunnelCoordinator(silentLogger, () => undefined, { mode: 'off' })).toBeUndefined();
    });

    it('builds nothing when a quick tunnel needs cloudflared and it is absent', () => {
        expect(
            createTunnelCoordinator(
                silentLogger,
                () => undefined,
                { mode: 'quick' },
                () => undefined
            )
        ).toBeUndefined();
    });

    it('builds a coordinator when cloudflared is on PATH', () => {
        const coordinator = createTunnelCoordinator(
            silentLogger,
            () => undefined,
            { mode: 'quick' },
            () => '/opt/homebrew/bin/cloudflared'
        );

        expect(coordinator).toBeInstanceOf(TunnelCoordinator);
    });

    it('builds a coordinator for a configured url without looking for cloudflared', () => {
        const coordinator = createTunnelCoordinator(
            silentLogger,
            () => undefined,
            { mode: 'url', url: 'https://bot.example.com' },
            () => undefined
        );

        expect(coordinator).toBeInstanceOf(TunnelCoordinator);
    });
});

describe('missingCloudflaredHint', () => {
    it('carries the platform install command', () => {
        expect(missingCloudflaredHint('darwin')).toContain('brew install cloudflared');
    });

    it('offers a url you already serve alongside the install', () => {
        const hint = missingCloudflaredHint('darwin');

        expect(hint).toContain('tunnel');
        expect(hint).toContain('https://bot.example.com');
    });
});
