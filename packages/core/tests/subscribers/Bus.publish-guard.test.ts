import { describe, it, expect } from 'vitest';

import { Bus } from '#subscribers/Bus';
import { PublishDefault } from '#subscribers/publishDefault';

import type { CoreBase } from '#interfaces/CoreBase';

// justified: the Bus only stores core, no member is read during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

describe('publish protection', () => {
    it('does not type-check a framework key through the public publish', () => {
        const bus = stubBus();

        // @ts-expect-error publish excludes the default keys
        bus.publish('unknownException', { uuid: crypto.randomUUID(), error: new Error('boom') });
        // @ts-expect-error same for a dispatch key
        bus.publish('interactionDispatched', {});
    });

    it('reaches every subscriber through the symbol path', () => {
        const bus = stubBus();
        let seen = 0;
        bus.on('unknownException', () => {
            seen += 1;
        });

        bus[PublishDefault]('unknownException', {
            uuid: crypto.randomUUID(),
            error: new Error('boom'),
            routeId: 'slash:probe'
        });

        expect(seen).toBe(1);
    });
});
