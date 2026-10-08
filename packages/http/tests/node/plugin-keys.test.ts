import { SeedcordErrorCode } from '@seedcord/errors';
import { afterEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { Plugin } from '#src/Plugin';

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

function config(): ConstructorParameters<typeof Seedcord>[0] {
    return { bot: { interactions: { path: null }, commands: { path: null } }, subscribers: { path: null } };
}

describe('attaching to the http Seedcord', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
    });

    it('attaches under a key that type-checks even when the host keeps a field of that name', () => {
        const seedcord = new Seedcord(config()).attach('token', Probe);

        expect(seedcord.token).toBeInstanceOf(Probe);
    });

    it('throws when an edge-only http plugin reaches the node Seedcord past the types', () => {
        const seedcord = new Seedcord(config());

        // @ts-expect-error EdgeOnly declares runtime 'edge'
        expect(() => seedcord.attach('edge', EdgeOnly)).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginScopeMismatch })
        );
    });
});
