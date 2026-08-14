import { Bus, Subscriber, WebhookLog, WebhookUrl, Subscribe } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerSubscribers } from '@src/dispatch/registerSubscribers';

import { emptyManifest } from '../helpers/fixtures';

import type { CoreBase, SubscriptionData } from '@seedcord/core';
import type { RouteManifest } from '@src/manifest/RouteManifest';

const ran: string[] = [];

class EdgeReporter extends Subscriber<'unknownException', CoreBase> {
    execute(): Promise<void> {
        ran.push('edge');
        return Promise.resolve();
    }
}

@Subscribe('unknownException')
@WebhookUrl('EDGE_UNSET_WEBHOOK_URL')
class UnsetReporter extends WebhookLog<'unknownException', CoreBase> {
    report(): { components: [] } {
        return { components: [] };
    }
}

// justified: the Bus only stores core, no member is read during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

function rowFor(exportName: string, load: () => Promise<Record<string, unknown>>): RouteManifest {
    return {
        ...emptyManifest(),
        subscriberRoutes: [{ keys: ['unknownException'], frequency: 'on', exportName, from: 'src/Edge.ts', load }]
    };
}

const payload = (): SubscriptionData<'unknownException'> => ({
    uuid: crypto.randomUUID(),
    error: new Error('boom'),
    routeId: 'slash:probe'
});

describe('manifest subscribers on workerd', () => {
    // the logger reads the environment at construction, and workerd binds no source by default
    beforeEach(() => {
        Envapter.useSource(new PortableSource({}));
    });

    it('imports the module on the first publish and runs the subscriber', async () => {
        ran.length = 0;
        const load = vi.fn().mockResolvedValue({ EdgeReporter });
        const bus = stubBus();
        registerSubscribers(bus, rowFor('EdgeReporter', load));

        expect(load).not.toHaveBeenCalled();

        bus[PublishDefault]('unknownException', payload());
        await vi.waitFor(() => {
            expect(ran).toEqual(['edge']);
        });
    });

    it('warns and sends nothing for a lazily registered reporter with no url set', async () => {
        const bus = stubBus();
        // the reporter warns through its own logger, so spy the prototype
        const warn = vi.spyOn(Logger.prototype, 'warn');
        const sent = vi.spyOn(WebhookLog, 'senderFor');
        registerSubscribers(
            bus,
            rowFor('UnsetReporter', () => Promise.resolve({ UnsetReporter }))
        );

        bus[PublishDefault]('unknownException', payload());

        // the probe runs only for an eagerly registered class, so the disabled branch lands inside execute
        await vi.waitFor(() => {
            expect(warn).toHaveBeenCalledWith(expect.stringContaining('UnsetReporter'));
        });
        expect(sent).not.toHaveBeenCalled();
        warn.mockRestore();
        sent.mockRestore();
    });
});
