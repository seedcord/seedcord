import { Bus, Subscribe, Subscriber } from '@seedcord/core';
import { PublishDefault, SubscriberLoader } from '@seedcord/core/internal';
import { BUILT_FILES_KEY } from '@seedcord/utils/node/internal';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';
import { resolve } from '#src/dispatch/resolve';
import { PingCommand } from '#tests/node/discovery/fixtures/handlers/PingCommand';

import type { CoreBase, SubscriptionData } from '@seedcord/core';
import type { APIInteraction } from 'discord-api-types/v10';

const ran: string[] = [];

@Subscribe('unknownException')
class Recorder extends Subscriber<'unknownException', CoreBase> {
    execute(): Promise<void> {
        ran.push('recorder');
        return Promise.resolve();
    }
}

// the object seedcord build writes onto the slot, rooted where an edge bot's files sit
function registerBuiltFiles(): void {
    Reflect.set(globalThis, Symbol.for(BUILT_FILES_KEY), {
        root: '/bot',
        folders: ['handlers', 'subscribers'],
        modules: {
            '/handlers/PingCommand.ts': () => Promise.resolve({ PingCommand }),
            '/subscribers/Recorder.ts': () => Promise.resolve({ Recorder })
        },
        text: {}
    });
}

function slashPayload(name: string): APIInteraction {
    // justified: resolve only reads type and data
    return { type: 2, data: { type: 1, name, options: [] } } as unknown as APIInteraction;
}

const exception = (): SubscriptionData<'unknownException'> => ({
    uuid: crypto.randomUUID(),
    dispatchId: 'd-1',
    error: new Error('boom'),
    origin: 'slash:probe'
});

describe('the folder loaders on workerd', () => {
    beforeEach(() => {
        // workerd binds no source by default
        Envapter.useSource(new PortableSource({}));
        registerBuiltFiles();
    });

    afterEach(() => {
        Reflect.deleteProperty(globalThis, Symbol.for(BUILT_FILES_KEY));
    });

    it('registers a handler from the built files', async () => {
        const dispatcher = new InteractionDispatcher('/bot/handlers');
        await dispatcher.init();

        expect(resolve(dispatcher.maps, slashPayload('ping'))?.ctor).toBe(PingCommand);
    });

    it('registers a subscriber from the built files', async () => {
        ran.length = 0;
        // justified: the Bus only stores core and reads no member during publish
        const bus = new Bus({} as unknown as CoreBase);
        await new SubscriberLoader(bus, '/bot/subscribers').init();

        bus[PublishDefault]('unknownException', exception());
        await vi.waitFor(() => {
            expect(ran).toEqual(['recorder']);
        });
    });
});
