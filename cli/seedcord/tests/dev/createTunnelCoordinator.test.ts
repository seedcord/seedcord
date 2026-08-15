import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it } from 'vitest';

import { createTunnelCoordinator, missingCloudflaredHint } from '#commands/dev/tunnel/createTunnelCoordinator';
import { TunnelCoordinator } from '#commands/dev/tunnel/TunnelCoordinator';

import { silentLogger } from '../silentLogger';

const VALID_TOKEN = `${'a'.repeat(24)}.${'b'.repeat(6)}.${'c'.repeat(27)}`;

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
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));

        const coordinator = createTunnelCoordinator(
            silentLogger,
            () => undefined,
            { mode: 'quick' },
            () => '/opt/homebrew/bin/cloudflared'
        );

        expect(coordinator).toBeInstanceOf(TunnelCoordinator);
    });

    it('builds a coordinator for a configured url without looking for cloudflared', () => {
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));

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

    it('is a block', () => {
        expect(missingCloudflaredHint('linux').split('\n')).toHaveLength(3);
    });
});
