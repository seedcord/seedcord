import { describe, it, expect } from 'vitest';

import { Bus } from '@subscribers/Bus';
import { PublishDefault } from '@subscribers/publishDefault';

import type { CoreBase } from '@interfaces/CoreBase';

// justified: the Bus only stores core, no member is read during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

describe('publish protection', () => {
    it('rejects a framework key at the public publish', () => {
        const bus = stubBus();

        // @ts-expect-error a default key is framework-owned, publish excludes it
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

        bus[PublishDefault]('unknownException', { uuid: crypto.randomUUID(), error: new Error('boom') });

        expect(seen).toBe(1);
    });

    it('leaves on() open for every key', () => {
        const bus = stubBus();
        let seen = 0;
        bus.on('interactionDispatched', () => {
            seen += 1;
        });

        bus[PublishDefault]('interactionDispatched', {
            routeId: 'slash:ping',
            kind: 'slash',
            outcome: 'handled',
            fallback: false,
            durationMs: 1,
            queuedMs: 2
        });

        expect(seen).toBe(1);
    });
});
