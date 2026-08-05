import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it } from 'vitest';

import { createTunnelCoordinator, missingCloudflaredHint } from '@commands/dev/tunnel/createTunnelCoordinator';
import { TunnelCoordinator } from '@commands/dev/tunnel/TunnelCoordinator';

import { silentLogger } from '../silentLogger';

const VALID_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAA.BBBBBB.CCCCCCCCCCCCCCCCCCCCCCCCCCC';

describe('createTunnelCoordinator', () => {
    it('builds nothing when cloudflared is absent', () => {
        expect(
            createTunnelCoordinator(
                silentLogger,
                () => undefined,
                () => undefined
            )
        ).toBeUndefined();
    });

    it('builds a coordinator when cloudflared is on PATH', () => {
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));

        const coordinator = createTunnelCoordinator(
            silentLogger,
            () => undefined,
            () => '/opt/homebrew/bin/cloudflared'
        );

        expect(coordinator).toBeInstanceOf(TunnelCoordinator);
    });
});

describe('missingCloudflaredHint', () => {
    it('carries the platform install command', () => {
        expect(missingCloudflaredHint('darwin')).toContain('brew install cloudflared');
    });
});
