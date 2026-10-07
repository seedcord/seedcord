import { afterEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { Plugin } from '#src/Plugin';

class Probe extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

describe('attaching to the http Seedcord', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
    });

    it('attaches under a key that type-checks even when the host keeps a field of that name', () => {
        const seedcord = new Seedcord({
            bot: { interactions: { path: null }, commands: { path: null } },
            subscribers: { path: null }
        }).attach('token', Probe);

        expect(seedcord.token).toBeInstanceOf(Probe);
    });
});
