import { InteractionKind, Fault, Silence } from '@seedcord/core';
import {
    DispatchContext,
    InteractionRun,
    interactionMiddleware,
    MiddlewareRegistry,
    PublishDefault
} from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { MessageFlags, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { gatewayRunConfig } from '#bot/controllers/gatewayRunConfig';
import { UnhandledAutocomplete, UnhandledRepliable } from '#bot/defaults';
import { harmlessError } from '#tests/utils/harmlessError';
import { TestNotice } from '#tests/utils/TestNotice';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { SubscriptionData } from '@seedcord/core';

const withResponse = { resource: { message: { id: 'sent' } } };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function mockInteraction() {
    return {
        reply: vi.fn().mockResolvedValue(withResponse),
        deferReply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue({ id: 'sent' }),
        followUp: vi.fn().mockResolvedValue({ id: 'sent' }),
        deleteReply: vi.fn().mockResolvedValue(undefined),
        respond: vi.fn().mockResolvedValue(undefined),
        isAutocomplete: vi.fn().mockReturnValue(false),
        isMessageComponent: vi.fn().mockReturnValue(false),
        isModalSubmit: vi.fn().mockReturnValue(false),
        isFromMessage: vi.fn().mockReturnValue(false),
        isChatInputCommand: vi.fn().mockReturnValue(true),
        isContextMenuCommand: vi.fn().mockReturnValue(false),
        isButton: vi.fn().mockReturnValue(false),
        isAnySelectMenu: vi.fn().mockReturnValue(false),
        user: { id: 'u1' },
        appPermissions: { bitfield: 0n },
        guild: null,
        guildId: 'g1',
        channelId: 'c1',
        id: 'i1',
        deferred: false,
        replied: false,
        ephemeral: null as boolean | null
    };
}

function mockCore(publish: ReturnType<typeof vi.fn>): Core {
    // justified: the fixture implements only the Core surface the boundary reads.
    return { bus: { [PublishDefault]: publish }, config: { errors: {}, notifications: {} } } as unknown as Core;
}

// justified: the fixture implements only the interaction surface the boundary reads.
function asInteraction(mock: ReturnType<typeof mockInteraction>): ValidInteractionTypes {
    return mock as unknown as ValidInteractionTypes;
}

async function runHandler(
    HandlerCtor: HandlerConstructor,
    interaction: ValidInteractionTypes,
    core: Core
): Promise<void> {
    const dispatch = new DispatchContext(
        interaction.isAutocomplete() ? InteractionKind.Autocomplete : InteractionKind.Slash,
        'test'
    );
    const run = new InteractionRun(
        gatewayRunConfig({
            interaction,
            core,
            dispatch,
            HandlerCtor,
            middlewares: new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware),
            logger: new Logger('Test')
        })
    );
    const start = await run.prepare();
    await start?.();
}

function answerFault(caught: Error, interaction: ValidInteractionTypes, core: Core): Promise<void> {
    class ThrowsRepliable extends UnhandledRepliable {
        override execute(): Promise<void> {
            throw caught;
        }
    }
    class ThrowsAutocomplete extends UnhandledAutocomplete {
        override execute(): Promise<void> {
            throw caught;
        }
    }
    return runHandler(interaction.isAutocomplete() ? ThrowsAutocomplete : ThrowsRepliable, interaction, core);
}

function faultEvents(publish: ReturnType<typeof vi.fn>): unknown[] {
    return publish.mock.calls
        .map(([event]) => event as unknown)
        .filter((event) => event === 'handledException' || event === 'unknownException');
}

describe('gateway fault answers', () => {
    let mock: ReturnType<typeof mockInteraction>;
    let publish: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mock = mockInteraction();
        publish = vi.fn();
    });

    it('replies the generic and publishes unknownException for a raw error on an unacked interaction', async () => {
        await answerFault(new Error('boom'), asInteraction(mock), mockCore(publish));

        expect(mock.reply).toHaveBeenCalledTimes(1);
        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(event).toBe('unknownException');
        expect(payload.error).toBeInstanceOf(Error);
    });

    it('attaches the interaction as metadata on a raw fault, so the report keeps its metadata.json', async () => {
        const interaction = asInteraction(mock);

        await answerFault(new Error('boom'), interaction, mockCore(publish));

        const [, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
        expect(payload.metadata).toBe(interaction);
    });

    it('swallows an api code listed in ignoreApiCodes, with no reply or report', async () => {
        // justified: the fixture implements only the Core surface the boundary reads.
        const core = {
            bus: { [PublishDefault]: publish },
            config: { errors: { ignoreApiCodes: [RESTJSONErrorCodes.UnknownInteraction] }, notifications: {} }
        } as unknown as Core;

        await answerFault(harmlessError(), asInteraction(mock), core);

        expect(mock.reply).not.toHaveBeenCalled();
        expect(faultEvents(publish)).toEqual([]);
    });

    it('edits the deferReply placeholder and publishes handledException for a reporting fault on a deferred interaction', async () => {
        mock.deferred = true;
        mock.ephemeral = false;

        await answerFault(new Fault({ cause: new Error('write failed') }), asInteraction(mock), mockCore(publish));

        expect(mock.editReply).toHaveBeenCalledTimes(1);
        expect(mock.followUp).not.toHaveBeenCalled();
        expect(mock.deleteReply).not.toHaveBeenCalled();
        expect(mock.reply).not.toHaveBeenCalled();
        const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'handledException'>];
        expect(event).toBe('handledException');
        expect(payload.denial).toBeInstanceOf(Fault);
    });

    it('follows up and reports no fault for a non-reporting denial on a replied interaction', async () => {
        mock.replied = true;

        await answerFault(new TestNotice(), asInteraction(mock), mockCore(publish));

        expect(mock.followUp).toHaveBeenCalledTimes(1);
        expect(faultEvents(publish)).toEqual([]);
    });

    it('replies ephemerally for a refusal by default', async () => {
        await answerFault(new TestNotice(), asInteraction(mock), mockCore(publish));

        const options = mock.reply.mock.calls[0]?.[0] as { flags: number };
        expect(options.flags & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
    });

    describe('autocomplete interactions', () => {
        beforeEach(() => {
            mock.isAutocomplete.mockReturnValue(true);
        });

        it('responds with empty choices and publishes unknownException with metadata for a raw error', async () => {
            const interaction = asInteraction(mock);

            await answerFault(new Error('boom'), interaction, mockCore(publish));

            expect(mock.respond).toHaveBeenCalledWith([]);
            expect(mock.reply).not.toHaveBeenCalled();
            const [event, payload] = publish.mock.calls[0] as [string, SubscriptionData<'unknownException'>];
            expect(event).toBe('unknownException');
            expect(payload.metadata).toBe(interaction);
        });

        it('does not send empty choices after the handler already responded', async () => {
            class RespondsThenStops extends UnhandledAutocomplete {
                override async execute(): Promise<void> {
                    await this.respond([{ name: 'a', value: 'a' }]);
                    throw new Silence('done');
                }
            }

            await runHandler(RespondsThenStops, asInteraction(mock), mockCore(publish));

            expect(mock.respond).toHaveBeenCalledTimes(1);
        });

        it('publishes responseAttempted for the empty-choices send', async () => {
            await answerFault(new Error('boom'), asInteraction(mock), mockCore(publish));

            const writes = publish.mock.calls.filter(([key]) => key === 'responseAttempted');
            expect(writes).toHaveLength(1);
            expect(writes[0]?.[1] as SubscriptionData<'responseAttempted'>).toMatchObject({
                method: 'respond',
                outcome: 'sent',
                messageId: null
            });
        });
    });

    describe('sender', () => {
        it("follows up through the handler's sender after the handler already replied", async () => {
            class RepliesThenThrows extends UnhandledRepliable {
                override async execute(): Promise<void> {
                    await this.reply('done');
                    throw new Error('boom');
                }
            }

            await runHandler(RepliesThenThrows, asInteraction(mock), mockCore(publish));

            expect(mock.reply).toHaveBeenCalledTimes(1);
            expect(mock.followUp).toHaveBeenCalledTimes(1);
        });

        it('replies through a new sender when the handler constructor throws', async () => {
            class ThrowsOnBuild extends UnhandledRepliable {
                constructor(...args: ConstructorParameters<typeof UnhandledRepliable>) {
                    super(...args);
                    throw new Error('boom');
                }
            }

            await runHandler(ThrowsOnBuild, asInteraction(mock), mockCore(publish));

            expect(mock.reply).toHaveBeenCalledTimes(1);
            expect(mock.followUp).not.toHaveBeenCalled();
        });
    });
});
