import { Silence, Fault } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleEventFault } from '@bot/handleEventFault';

import { TestNotice } from '../utils/TestNotice';

import type { Core } from '@interfaces/Core';
import type { SubscriptionData } from '@seedcord/core';

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

function stringCodedError(): DiscordAPIError {
    // the boundary reads `.code`, which is the second constructor argument, the rawError body's numeric
    // code is unrelated. djs returns string codes for some errors, this models that.
    return new DiscordAPIError(
        { code: 0, message: 'Unknown command' },
        'SLASH_COMMAND_UNKNOWN',
        400,
        'POST',
        'https://discord.com/api/x',
        { body: undefined, files: [] }
    );
}

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface the event boundary reads.
    return { bus: { [PublishDefault]: publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

describe('handleEventFault', () => {
    let publish: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        publish = vi.fn();
    });

    it('publishes handledException with an event source for a reporting denial', () => {
        handleEventFault(
            new Fault({ cause: new Error('write failed') }),
            'messageCreate',
            'Starboard',
            [{}],
            mockCore(publish)
        );

        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'handledException'>];
        expect(event).toBe('handledException');
        if (payload.source.kind !== 'event') throw new Error('expected event source');
        expect(payload.source.eventName).toBe('messageCreate');
        expect(payload.source.handler).toBe('Starboard');
    });

    it('publishes unknownException with event-shaped metadata for a raw error', () => {
        handleEventFault(new Error('boom'), 'guildMemberRemove', 'Farewell', [{}], mockCore(publish));

        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(event).toBe('unknownException');
        expect(payload.error).toBeInstanceOf(Error);
        expect(payload.metadata).toMatchObject({ eventName: 'guildMemberRemove', handler: 'Farewell' });
    });

    it('stays quiet for a Silence', () => {
        handleEventFault(new Silence('filtered'), 'guildMemberAdd', 'Welcome', [{}], mockCore(publish));

        expect(publish).not.toHaveBeenCalled();
    });

    it('debug-logs a Silence reason by default', () => {
        const debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

        handleEventFault(new Silence('actor is a bot'), 'messageCreate', 'PingPong', [{}], mockCore(publish));

        expect(debug).toHaveBeenCalledWith('Silence: actor is a bot');
        debug.mockRestore();
    });

    it('omits the Silence debug line when logSilences is false', () => {
        const debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
        // justified: the fixture implements only the Core surface the event boundary reads.
        const core = {
            bus: { [PublishDefault]: publish },
            config: { errors: { logSilences: false }, notifications: {} }
        } as unknown as Core;

        handleEventFault(new Silence('actor is a bot'), 'messageCreate', 'PingPong', [{}], core);

        expect(debug).not.toHaveBeenCalled();
        debug.mockRestore();
    });

    it('appends the error cause first line to the compact fault log', () => {
        const cause = new Error('reply() acknowledged this interaction');
        cause.name = 'AckTrace';
        const error = new Error('defer() was called after a reply', { cause });
        const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        handleEventFault(error, 'messageCreate', 'PingPong', [{}], mockCore(publish));

        expect(errorLog.mock.calls[0]?.[0]).toContain('caused by AckTrace: reply() acknowledged this interaction');
        errorLog.mockRestore();
    });

    it('leaves the compact fault log without a cause line when the error has no Error cause', () => {
        const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        handleEventFault(new Error('plain boom'), 'messageCreate', 'PingPong', [{}], mockCore(publish));

        expect(errorLog.mock.calls[0]?.[0]).not.toContain('caused by');
        errorLog.mockRestore();
    });

    it('stays quiet for a non-reporting denial', () => {
        handleEventFault(new TestNotice(), 'voiceStateUpdate', 'Tracker', [{}], mockCore(publish));

        expect(publish).not.toHaveBeenCalled();
    });

    it('reports a dead-resource api code by default, since ignoreEventApiCodes is empty', () => {
        handleEventFault(deadResourceError(), 'messageReactionAdd', 'ReactionRole', [{}], mockCore(publish));

        expect(publish).toHaveBeenCalledWith('unknownException', expect.anything());
    });

    it('swallows an api code listed in ignoreEventApiCodes with no report', () => {
        // justified: the fixture implements only the Core surface the event boundary reads.
        const core = {
            bus: { [PublishDefault]: publish },
            config: { errors: { ignoreEventApiCodes: [RESTJSONErrorCodes.UnknownMessage] }, notifications: {} }
        } as unknown as Core;

        handleEventFault(deadResourceError(), 'messageDelete', 'Cleanup', [{}], core);

        expect(publish).not.toHaveBeenCalled();
    });

    it('swallows a string-coded api error listed in ignoreEventApiCodes', () => {
        // justified: the fixture implements only the Core surface the event boundary reads.
        const core = {
            bus: { [PublishDefault]: publish },
            config: { errors: { ignoreEventApiCodes: ['SLASH_COMMAND_UNKNOWN'] }, notifications: {} }
        } as unknown as Core;

        handleEventFault(stringCodedError(), 'messageCreate', 'Cleanup', [{}], core);

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
