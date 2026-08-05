import { describe, expect, it } from 'vitest';

import { createTunnelCoordinator, missingCloudflaredHint } from '@commands/dev/tunnel/createTunnelCoordinator';

import { silentLogger } from '../silentLogger';

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
});

describe('missingCloudflaredHint', () => {
    it('carries the platform install command', () => {
        expect(missingCloudflaredHint('darwin')).toContain('brew install cloudflared');
    });
});
