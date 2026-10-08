import { Bus, Subscriber, WebhookLog, WebhookUrl, Subscribe } from '@seedcord/core';
import { PublishDefault, SubscriberLoader } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUILT_ROOT, clearBuiltFiles, registerBuiltFiles } from '#tests/helpers/builtFiles';

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

// justified: the Bus only stores core and reads no member during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

async function loadInto(bus: Bus, subscriber: abstract new (...args: never[]) => object): Promise<void> {
    registerBuiltFiles({ [`/subscribers/${subscriber.name}.ts`]: { [subscriber.name]: subscriber } });
    await new SubscriberLoader(bus, `${BUILT_ROOT}/subscribers`).init();
}

const payload = (): SubscriptionData<'unknownException'> => ({
    uuid: crypto.randomUUID(),
    dispatchId: 'd-1',
    error: new Error('boom'),
    origin: 'slash:probe'
});

describe('subscribers loaded from the built files on workerd', () => {
    // workerd binds no source by default
    beforeEach(() => {
        Envapter.useSource(new PortableSource({}));
    });

    afterEach(clearBuiltFiles);

    it('runs a loaded subscriber on publish', async () => {
        ran.length = 0;
        const bus = stubBus();
        await loadInto(bus, EdgeReporter);

        bus[PublishDefault]('unknownException', payload());
        await vi.waitFor(() => {
            expect(ran).toEqual(['edge']);
        });
    });

    it('warns at registration and never registers a reporter with no url set', async () => {
        const bus = stubBus();
        // the warn comes off the bus's own logger instance
        const warn = vi.spyOn(Logger.prototype, 'warn');
        const sent = vi.spyOn(WebhookLog, 'senderFor');

        await loadInto(bus, UnsetReporter);

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('UnsetReporter'));
        bus[PublishDefault]('unknownException', payload());
        expect(sent).not.toHaveBeenCalled();
        warn.mockRestore();
        sent.mockRestore();
    });

    it('throws at registration for a malformed webhook url', async () => {
        Envapter.useSource(new PortableSource({ EDGE_BAD_WEBHOOK_URL: 'https://example.com/nope' }));

        await expect(loadInto(stubBus(), MalformedReporter)).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.ConfigWebhookUrlInvalid })
        );
    });
});
