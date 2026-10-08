import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { Plugin } from '#src/Plugin';
import { serverConfig } from '#tests/helpers/nodeHost';

import type { CoreBase } from '@seedcord/core';

class Probe extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class EdgeOnly extends Plugin<{ runtime: 'edge' }> {
    constructor(host: CoreBase) {
        super(host, { runtime: 'edge' });
    }
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

describe('attaching to the http Seedcord', () => {
    it('attaches under a key that type-checks even when the host keeps a field of that name', async () => {
        await using seedcord = new Seedcord(serverConfig());
        const attached = seedcord.attach('token', Probe);

        expect(attached.token).toBeInstanceOf(Probe);
    });

    it('throws when an edge-only http plugin reaches the node Seedcord past the types', async () => {
        await using seedcord = new Seedcord(serverConfig());

        // @ts-expect-error EdgeOnly declares runtime 'edge'
        expect(() => seedcord.attach('edge', EdgeOnly)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginScopeMismatch })
        );
    });
});
