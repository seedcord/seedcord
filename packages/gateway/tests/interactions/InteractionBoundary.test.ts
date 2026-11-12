import { InteractionKind, Fault, Silence } from '@seedcord/core';
import { InteractionRun, PublishDefault } from '@seedcord/core/internal';
import { PluginHost } from '@seedcord/core/plugin';
import { Logger } from '@seedcord/logger';
import { MessageFlags, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { autocompleteRunConfig, repliableRunConfig } from '#bot/controllers/gatewayRunConfig';
import { UnhandledAutocomplete, UnhandledRepliable } from '#bot/defaults';
import { harmlessError } from '#tests/utils/harmlessError';
import { pluginWithMembers } from '#tests/utils/pluginWithMembers';
import { TestNotice } from '#tests/utils/TestNotice';

import type { HandlerSlots } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { SubscriptionData } from '@seedcord/core';
import type { InteractionRunConfig } from '@seedcord/core/internal';
import type { Config } from '@seedcord/types';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';

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

class BoundaryHost extends PluginHost<'gateway', 'server'> {
    public readonly config: Config;
    // justified: the boundary never reads rest
    public readonly rest = {} as PluginHost<'gateway', 'server'>['rest'];
    public readonly applicationId = 'app-1';

    constructor(publish: ReturnType<typeof vi.fn>, errors: Config['errors']) {
        super('gateway', 'server', undefined);
        // justified: the boundary reads only these two config sections
        this.config = { errors, notifications: {} } as unknown as Config;
        Object.assign(this, { bus: { [PublishDefault]: publish } });
    }
}

function mockCore(publish: ReturnType<typeof vi.fn>, errors: Config['errors'] = {}): BoundaryHost & Core {
    // justified: the fixture implements only the Core surface the boundary reads.
    return new BoundaryHost(publish, errors) as unknown as BoundaryHost & Core;
}

type Mock = ReturnType<typeof mockInteraction>;

// justified: the fixture implements only the interaction surface the boundary reads.
function asInteraction(mock: Mock): ValidInteractionTypes {
    return mock as unknown as ValidInteractionTypes;
}

// justified: the same fixture, read as the slash command it mocks by default
function asSlash(mock: Mock): ChatInputCommandInteraction {
    return mock as unknown as ChatInputCommandInteraction;
}

// justified: the same fixture, read as an autocomplete once isAutocomplete returns true
function asAutocomplete(mock: Mock): AutocompleteInteraction {
    return mock as unknown as AutocompleteInteraction;
}

async function start(config: InteractionRunConfig): Promise<void> {
    const started = await new InteractionRun(config).prepare();
    await started?.();
}

function runSlash(
    ctor: HandlerSlots[InteractionKind.Slash],
    event: ChatInputCommandInteraction,
    core: Core
): Promise<void> {
    const resolved = { kind: InteractionKind.Slash, route: 'test', fallback: false, ctor, event } as const;
    return start(repliableRunConfig({ resolved, core, middlewares: [], logger: new Logger('Test') }));
}

function runAutocomplete(
    ctor: HandlerSlots[InteractionKind.Autocomplete],
    event: AutocompleteInteraction,
    core: Core
): Promise<void> {
    const resolved = { kind: InteractionKind.Autocomplete, route: 'test', fallback: false, ctor, event } as const;
    return start(autocompleteRunConfig({ resolved, core, logger: new Logger('Test') }));
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
    if (interaction.isAutocomplete()) return runAutocomplete(ThrowsAutocomplete, interaction, core);
    if (interaction.isChatInputCommand()) return runSlash(ThrowsRepliable, interaction, core);
    throw new Error('the mock is a slash command or an autocomplete');
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
        const core = mockCore(publish, { ignoreApiCodes: [RESTJSONErrorCodes.UnknownInteraction] });

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

    it("follows up and doesn't report a fault for a non-reporting denial on a replied interaction", async () => {
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

            await runAutocomplete(RespondsThenStops, asAutocomplete(mock), mockCore(publish));

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

            await runSlash(RepliesThenThrows, asSlash(mock), mockCore(publish));

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

            await runSlash(ThrowsOnBuild, asSlash(mock), mockCore(publish));

            expect(mock.reply).toHaveBeenCalledTimes(1);
            expect(mock.followUp).not.toHaveBeenCalled();
        });
    });
});

describe('plugin members on a gateway interaction', () => {
    it('builds a member from the interaction and sets it on the handler', async () => {
        let seen: unknown;
        class Reads extends UnhandledRepliable {
            override execute(): Promise<void> {
                // codegen types the members in a bot, and it doesn't run for this test bot
                seen = Reflect.get(this, 'tag');
                return Promise.resolve();
            }
        }
        const core = mockCore(vi.fn());
        core.attach(
            'tagging',
            pluginWithMembers({ tag: (origin) => `${String(origin.guildId)}:${String(origin.userLocale)}` })
        );

        await runSlash(Reads, asSlash(Object.assign(mockInteraction(), { locale: 'pl' })), core);

        expect(seen).toBe('g1:pl');
    });
});
