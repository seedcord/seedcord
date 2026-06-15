import { Silence, Fault } from '@seedcord/kit';
import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleEventFault } from '@bot/handleEventFault';
import { faultThrottle } from '@miscellaneous/extractErrorResponse';

import { TestDenial } from '../utils/TestDenial';

import type { Core } from '@interfaces/Core';
import type { AllSubscriptions } from '@subscribers/types/Subscriptions';

function deadResourceError(): DiscordAPIError {
    return new DiscordAPIError(
        { code: RESTJSONErrorCodes.UnknownMessage, message: 'Unknown Message' },
        RESTJSONErrorCodes.UnknownMessage,
        404,
        'GET',
        'https://discord.com/api/channels/x/messages/y',
        { body: undefined, files: [] }
    );
}

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface the event boundary reads.
    return { bus: { publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

describe('handleEventFault', () => {
    let publish: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        publish = vi.fn();
        faultThrottle.clear();
    });

    it('publishes handledException with an event source for a reporting denial', () => {
        handleEventFault(
            new Fault({ cause: new Error('write failed') }),
            'messageCreate',
            'Starboard',
            [{}],
            mockCore(publish)
        );

        const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['handledException']];
        expect(event).toBe('handledException');
        if (payload.source.kind !== 'event') throw new Error('expected event source');
        expect(payload.source.eventName).toBe('messageCreate');
        expect(payload.source.handler).toBe('Starboard');
    });

    it('publishes unknownException with event-shaped metadata for a raw error', () => {
        handleEventFault(new Error('boom'), 'guildMemberRemove', 'Farewell', [{}], mockCore(publish));

        const [event, payload] = publish.mock.calls[0] as [string, AllSubscriptions['unknownException']];
        expect(event).toBe('unknownException');
        expect(payload.error).toBeInstanceOf(Error);
        expect(payload.metadata).toMatchObject({ eventName: 'guildMemberRemove', handler: 'Farewell' });
    });

    it('stays quiet for a Silence', () => {
        handleEventFault(new Silence('filtered'), 'guildMemberAdd', 'Welcome', [{}], mockCore(publish));

        expect(publish).not.toHaveBeenCalled();
    });

    it('stays quiet for a non-reporting denial', () => {
        handleEventFault(new TestDenial(), 'voiceStateUpdate', 'Tracker', [{}], mockCore(publish));

        expect(publish).not.toHaveBeenCalled();
    });

    it('reports a dead-resource api code by default, since ignoreEventApiCodes is empty', () => {
        handleEventFault(deadResourceError(), 'messageReactionAdd', 'ReactionRole', [{}], mockCore(publish));

        expect(publish).toHaveBeenCalledWith('unknownException', expect.anything());
    });

    it('swallows an api code listed in ignoreEventApiCodes with no report', () => {
        // justified: the fixture implements only the Core surface the event boundary reads.
        const core = {
            bus: { publish },
            config: { errors: { ignoreEventApiCodes: [RESTJSONErrorCodes.UnknownMessage] }, notifications: {} }
        } as unknown as Core;

        handleEventFault(deadResourceError(), 'messageDelete', 'Cleanup', [{}], core);

        expect(publish).not.toHaveBeenCalled();
    });

    it('rethrows a non-Error value to the root catch', () => {
        expect(() => handleEventFault('a thrown string', 'ready', 'Boot', [], mockCore(publish))).toThrow();
        expect(publish).not.toHaveBeenCalled();
    });

    it('throttles duplicate event faults from the same handler within the window to one report', () => {
        const core = mockCore(publish);

        handleEventFault(new Fault({ cause: new Error('first') }), 'messageCreate', 'Starboard', [{}], core);
        handleEventFault(new Fault({ cause: new Error('second') }), 'messageCreate', 'Starboard', [{}], core);

        expect(publish).toHaveBeenCalledTimes(1);
    });
});
