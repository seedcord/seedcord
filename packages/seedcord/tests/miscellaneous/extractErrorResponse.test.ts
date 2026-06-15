import { CustomId, Fault } from '@seedcord/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { extractErrorResponse, faultThrottle } from '@miscellaneous/extractErrorResponse';

import { TestNotice } from '../utils/TestNotice';

import type { Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { AllSubscriptions } from '@subscribers/types/Subscriptions';

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface extractErrorResponse reads.
    return { bus: { publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

function slashInteraction(commandName = 'ban'): Repliables {
    // justified: the fixture implements only the Repliables surface buildInteractionSource reads.
    return {
        isChatInputCommand: () => true,
        isContextMenuCommand: () => false,
        isButton: () => false,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        commandName,
        options: { getSubcommand: () => null, getSubcommandGroup: () => null },
        user: { id: 'u1' },
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1'
    } as unknown as Repliables;
}

function buttonInteraction(customId: string): Repliables {
    // justified: the fixture implements only the Repliables surface the source + key read.
    return {
        isChatInputCommand: () => false,
        isContextMenuCommand: () => false,
        isButton: () => true,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        customId,
        user: { id: 'u1' },
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1'
    } as unknown as Repliables;
}

describe('extractErrorResponse', () => {
    beforeEach(() => {
        faultThrottle.clear();
    });

    it('publishes handledException for a reporting denial with the uuid the reply shows', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('write failed') });
        const result = extractErrorResponse(denial, mockCore(publish), {
            interaction: slashInteraction(),
            guild: null,
            user: null
        });

        expect(publish).toHaveBeenCalledTimes(1);
        const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['handledException']];
        expect(event).toBe('handledException');
        expect(payload.denial).toBe(denial);
        expect(payload.uuid).toBe(result.uuid);
        if (payload.source.kind !== 'interaction') throw new Error('expected interaction source');
        expect(payload.source.command).toBe('ban');

        if (result.response.kind !== 'embed') throw new Error('expected embed arm');
        expect(result.response.embeds[0]?.data.description).toContain(result.uuid);
    });

    it('publishes unknownException for a raw, non-denial throw', () => {
        const publish = vi.fn();
        const result = extractErrorResponse(new Error('a bug'), mockCore(publish), { guild: null, user: null });

        expect(publish).toHaveBeenCalledWith('unknownException', expect.objectContaining({ uuid: result.uuid }));
    });

    it('publishes nothing for a non-reporting denial', () => {
        const publish = vi.fn();
        extractErrorResponse(new TestNotice(), mockCore(publish), {
            interaction: slashInteraction(),
            guild: null,
            user: null
        });

        expect(publish).not.toHaveBeenCalled();
    });

    it('publishes handledException with an event source for a reporting denial on the event path', () => {
        const publish = vi.fn();
        const denial = new Fault({ cause: new Error('write failed') });
        extractErrorResponse(denial, mockCore(publish), {
            event: { name: 'messageCreate', handler: 'Starboard', args: [{}], channelId: 'ch1' },
            guild: null,
            user: null
        });

        const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['handledException']];
        expect(event).toBe('handledException');
        expect(payload.denial).toBe(denial);
        if (payload.source.kind !== 'event') throw new Error('expected event source');
        expect(payload.source.eventName).toBe('messageCreate');
        expect(payload.source.handler).toBe('Starboard');
        expect(payload.source.channelId).toBe('ch1');
    });

    it('throttles a duplicate fault within the window to one publish', () => {
        const publish = vi.fn();
        const core = mockCore(publish);
        const origin = { interaction: slashInteraction('throttle-probe'), guild: null, user: null };

        extractErrorResponse(new Fault({ cause: new Error('first') }), core, origin);
        extractErrorResponse(new Fault({ cause: new Error('second') }), core, origin);

        expect(publish).toHaveBeenCalledTimes(1);
    });

    it('stamps the throttle on publish, not on webhook send success', () => {
        // the bus is fire-and-forget, so the second fault is suppressed by the first's publish-time stamp
        // even though no subscriber send has been observed to succeed (separate spy stands in for a retry).
        const origin = { interaction: slashInteraction('stamp-probe'), guild: null, user: null };

        const firstPublish = vi.fn();
        extractErrorResponse(new Fault({ cause: new Error('x') }), mockCore(firstPublish), origin);
        expect(firstPublish).toHaveBeenCalledTimes(1);

        const retryPublish = vi.fn();
        extractErrorResponse(new Fault({ cause: new Error('x') }), mockCore(retryPublish), origin);
        expect(retryPublish).not.toHaveBeenCalled();
    });

    it('collapses parameterized component customIds to one throttle key via the stable prefix', () => {
        const publish = vi.fn();
        const core = mockCore(publish);
        const Pager = new CustomId('pager').int('page');

        const origin = (page: number): Parameters<typeof extractErrorResponse>[2] => ({
            interaction: buttonInteraction(Pager.encode({ page })),
            guild: null,
            user: null
        });

        extractErrorResponse(new Fault({ cause: new Error('p1') }), core, origin(1));
        extractErrorResponse(new Fault({ cause: new Error('p2') }), core, origin(2));

        expect(publish).toHaveBeenCalledTimes(1);
    });
});
