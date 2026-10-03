import { Bus, Subscriber, WebhookLog, WebhookUrl, Subscribe } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerSubscribers } from '#src/dispatch/registerSubscribers';

import type { CoreBase, SubscriptionData } from '@seedcord/core';

const ran: string[] = [];

@Subscribe('unknownException')
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

@Subscribe('unknownException')
@WebhookUrl('EDGE_BAD_WEBHOOK_URL')
class MalformedReporter extends WebhookLog<'unknownException', CoreBase> {
    report(): { components: [] } {
        return { components: [] };
    }
}

class NotASubscriber {
    public readonly kind = 'plain';
}

// justified: the Bus only stores core and reads no member during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

const payload = (): SubscriptionData<'unknownException'> => ({
    uuid: crypto.randomUUID(),
    dispatchId: 'd-1',
    error: new Error('boom'),
    origin: 'slash:probe'
});

describe('manifest subscribers on workerd', () => {
    // workerd binds no source by default
    beforeEach(() => {
        Envapter.useSource(new PortableSource({}));
    });

    it('runs a listed subscriber on publish', async () => {
        ran.length = 0;
        const bus = stubBus();
        registerSubscribers(bus, [EdgeReporter]);

        bus[PublishDefault]('unknownException', payload());
        await vi.waitFor(() => {
            expect(ran).toEqual(['edge']);
        });
    });

    it('warns at registration and never registers a reporter with no url set', () => {
        const bus = stubBus();
        // the warn comes off the bus's own logger instance
        const warn = vi.spyOn(Logger.prototype, 'warn');
        const sent = vi.spyOn(WebhookLog, 'senderFor');

        registerSubscribers(bus, [UnsetReporter]);

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('UnsetReporter'));
        bus[PublishDefault]('unknownException', payload());
        expect(sent).not.toHaveBeenCalled();
        warn.mockRestore();
        sent.mockRestore();
    });

    // SubscriberLoader.init throws the same error on node
    it('throws at registration for a malformed webhook url', () => {
        Envapter.useSource(new PortableSource({ EDGE_BAD_WEBHOOK_URL: 'https://example.com/nope' }));

        expect(() => registerSubscribers(stubBus(), [MalformedReporter])).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigWebhookUrlInvalid })
        );
    });

    it('reports a subscriber class carrying no @Subscribe', () => {
        class Unsubscribed extends Subscriber<'unknownException', CoreBase> {
            execute(): Promise<void> {
                return Promise.resolve();
            }
        }

        expect(() => registerSubscribers(stubBus(), [Unsubscribed])).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ManifestEntryNoRoutes })
        );
    });

    it('reports a non-class entry', () => {
        expect(() => registerSubscribers(stubBus(), [null as never])).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ManifestEntryWrongClass })
        );
    });

    it('throws naming the array and the class when a listed class is not a subscriber', () => {
        expect(() => registerSubscribers(stubBus(), [NotASubscriber as never])).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ManifestEntryWrongClass })
        );
    });
});
