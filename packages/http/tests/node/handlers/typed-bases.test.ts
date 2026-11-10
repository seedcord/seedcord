import { DispatchContext, PublishDefault } from '@seedcord/core/internal';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, expectTypeOf, it, vi } from 'vite-plus/test';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { UserContextMenuHandler, MessageContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { built } from '#tests/helpers/built';

import type { Core } from '#interfaces/Core';
import type { REST } from '@discordjs/rest';
import type {
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteraction,
    APIChatInputApplicationCommandInteractionData,
    APIMessage,
    APIMessageApplicationCommandInteraction,
    APIUser,
    APIUserApplicationCommandInteraction
} from 'discord-api-types/v10';

declare module '@seedcord/core' {
    interface SlashRegistry {
        hbBan: {
            options: {
                reason: { kind: 'string'; required: true };
            };
            cache: 'cached';
        };
        hbKick: {
            options: {
                note: { kind: 'string'; required: false };
            };
            cache: 'cached';
        };
        hbSearch: {
            options: {
                query: { kind: 'string'; required: true; autocomplete: true };
                tag: { kind: 'string'; required: false; autocomplete: true };
                limit: { kind: 'integer'; required: false };
            };
            cache: 'cached';
        };
    }
}

const user: APIUser = { id: 'u1', username: 'dhruv', discriminator: '0', global_name: null, avatar: null };

function coreMock(): { core: Core; post: ReturnType<typeof vi.fn> } {
    const post = vi.fn().mockResolvedValue(undefined);
    // justified: these tests reach only core.rest.post
    // justified: a real Core always carries a bus, respond publishes through it
    const bus = { [PublishDefault]: () => undefined };
    return { core: { rest: { post } as unknown as REST, bus } as unknown as Core, post };
}

// justified: fixtures carry only the fields the handlers read
function slashEvent(
    data: Partial<APIChatInputApplicationCommandInteractionData>
): APIChatInputApplicationCommandInteraction {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 2,
        data: { id: 'c1', type: 1, ...data }
    } as unknown as APIChatInputApplicationCommandInteraction;
}

function autoEvent(data: Record<string, unknown>): APIApplicationCommandAutocompleteInteraction {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 4,
        data: { id: 'c1', type: 1, ...data }
    } as unknown as APIApplicationCommandAutocompleteInteraction;
}

describe('SlashHandler options and match', () => {
    it('reads typed options off the raw payload', async () => {
        let seen: string | null = null;
        class Ban extends SlashHandler<'hbBan'> {
            execute(): Promise<void> {
                seen = this.options.getString('reason');
                return Promise.resolve();
            }
        }
        const event = slashEvent({
            options: [{ name: 'reason', type: ApplicationCommandOptionType.String, value: 'spam' }]
        });

        await built(Ban, event, coreMock().core, new DispatchContext('slash', 'hbBan')).execute();

        expect(seen).toBe('spam');
    });

    it('dispatches the case for the selected route with its own typed options', async () => {
        class Mod extends SlashHandler<'hbBan' | 'hbKick'> {
            async execute(): Promise<void> {}
            run(): Promise<string> {
                return this.match({
                    hbBan: (options) => `ban:${options.getString('reason')}`,
                    hbKick: (options) => `kick:${String(options.getString('note'))}`
                });
            }
        }
        const event = slashEvent({
            options: [{ name: 'note', type: ApplicationCommandOptionType.String, value: 'bye' }]
        });

        await expect(built(Mod, event, coreMock().core, new DispatchContext('slash', 'hbKick')).run()).resolves.toBe(
            'kick:bye'
        );
    });

    it('resolves to the union of what its cases return', async () => {
        class Mod extends SlashHandler<'hbBan' | 'hbKick'> {
            async execute(): Promise<void> {}
            async run(): Promise<unknown> {
                const result = await this.match({
                    hbBan: () => ({ hits: ['a'] }),
                    hbKick: () => Promise.resolve({ text: 'b' })
                });
                expectTypeOf(result).toEqualTypeOf<{ hits: string[] } | { text: string }>();

                await this.match<string>({
                    hbBan: () => 'banned',
                    // @ts-expect-error this case returns a number.
                    hbKick: () => 1
                });
                return result;
            }
        }

        const event = slashEvent({ options: [] });
        await expect(built(Mod, event, coreMock().core, new DispatchContext('slash', 'hbKick')).run()).resolves.toEqual(
            { text: 'b' }
        );
    });

    it('throws MatchCaseMissing for a route with no case', async () => {
        class Ban extends SlashHandler<'hbBan'> {
            async execute(): Promise<void> {
                await this.match({ hbBan: () => undefined });
            }
        }
        const event = slashEvent({ options: [] });

        await expect(
            built(Ban, event, coreMock().core, new DispatchContext('slash', 'hbGhost')).execute()
        ).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordTypeError', SeedcordErrorCode.MatchCaseMissing)
        );
    });

    it('throws MatchCaseMissing for a prototype-named route with no case', async () => {
        class Ban extends SlashHandler<'hbBan'> {
            async execute(): Promise<void> {
                await this.match({ hbBan: () => undefined });
            }
        }
        const event = slashEvent({ options: [] });

        await expect(
            built(Ban, event, coreMock().core, new DispatchContext('slash', 'constructor')).execute()
        ).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordTypeError', SeedcordErrorCode.MatchCaseMissing)
        );
    });
});

describe('AutocompleteHandler focused, match, options, route', () => {
    const searchEvent = autoEvent({
        options: [
            { name: 'query', type: ApplicationCommandOptionType.String, value: 'par', focused: true },
            { name: 'limit', type: ApplicationCommandOptionType.Integer, value: '5' }
        ]
    });
    const searchDispatch = new DispatchContext('autocomplete', 'hbSearch');

    it('exposes the focused field and dispatches its case through respond', async () => {
        class Search extends AutocompleteHandler<'hbSearch'> {
            async execute(): Promise<void> {
                await this.match({
                    query: (value, respond) => respond([{ name: value, value }]),
                    tag: (value, respond) => respond([{ name: value, value }])
                });
            }
        }
        const { core, post } = coreMock();

        await built(Search, searchEvent, core, searchDispatch).execute();

        const [route, options] = post.mock.calls[0] as [string, { body: { type: number; data: unknown } }];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body).toEqual({ type: 8, data: { choices: [{ name: 'par', value: 'par' }] } });
    });

    it('resolves to the union of what its cases return', async () => {
        class Search extends AutocompleteHandler<'hbSearch'> {
            async execute(): Promise<void> {}
            async run(): Promise<unknown> {
                const result = await this.match({
                    query: () => ({ hits: ['a'] }),
                    tag: () => Promise.resolve({ text: 'b' })
                });
                expectTypeOf(result).toEqualTypeOf<{ hits: string[] } | { text: string }>();
                return result;
            }
        }

        await expect(built(Search, searchEvent, coreMock().core, searchDispatch).run()).resolves.toEqual({
            hits: ['a']
        });
    });

    it('reads entered siblings and the selected route', async () => {
        let sibling: number | null = null;
        let route = '';
        class Search extends AutocompleteHandler<'hbSearch'> {
            execute(): Promise<void> {
                sibling = this.options.getInteger('limit');
                route = this.route;
                return Promise.resolve();
            }
        }

        await built(Search, searchEvent, coreMock().core, searchDispatch).execute();

        expect(sibling).toBe(5);
        expect(route).toBe('hbSearch');
    });

    it('throws MatchCaseMissing for a focused field with no case', async () => {
        class Search extends AutocompleteHandler<'hbSearch'> {
            async execute(): Promise<void> {
                await this.match({
                    query: () => undefined,
                    tag: () => undefined
                });
            }
        }
        const event = autoEvent({
            options: [{ name: 'ghost', type: ApplicationCommandOptionType.String, value: 'x', focused: true }]
        });

        await expect(built(Search, event, coreMock().core, searchDispatch).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordTypeError', SeedcordErrorCode.MatchCaseMissing)
        );
    });

    it('throws MatchCaseMissing for a prototype-named focused field', async () => {
        class Search extends AutocompleteHandler<'hbSearch'> {
            async execute(): Promise<void> {
                await this.match({
                    query: () => undefined,
                    tag: () => undefined
                });
            }
        }
        const event = autoEvent({
            options: [{ name: 'constructor', type: ApplicationCommandOptionType.String, value: 'x', focused: true }]
        });

        await expect(built(Search, event, coreMock().core, searchDispatch).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordTypeError', SeedcordErrorCode.MatchCaseMissing)
        );
    });

    it('throws AutocompleteNoFocusedOption when nothing is focused', () => {
        class Search extends AutocompleteHandler<'hbSearch'> {
            execute(): Promise<void> {
                void this.focused;
                return Promise.resolve();
            }
        }
        const event = autoEvent({
            options: [{ name: 'limit', type: ApplicationCommandOptionType.Integer, value: '4' }]
        });

        let caught: unknown = null;
        try {
            void built(Search, event, coreMock().core, searchDispatch).execute();
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.AutocompleteNoFocusedOption)).toBe(true);
    });
});

describe('ContextMenuHandler target', () => {
    const message = { id: 'm1', content: 'hello' } as unknown as APIMessage;

    function userMenuEvent(): APIUserApplicationCommandInteraction {
        return {
            application_id: 'app-1',
            id: 'int-1',
            token: 'tok',
            type: 2,
            data: {
                id: 'c1',
                type: ApplicationCommandType.User,
                target_id: 'u1',
                resolved: { users: { u1: user }, members: { u1: { nick: 'nick', roles: [], permissions: '0' } } }
            }
        } as unknown as APIUserApplicationCommandInteraction;
    }

    function messageMenuEvent(): APIMessageApplicationCommandInteraction {
        return {
            application_id: 'app-1',
            id: 'int-1',
            token: 'tok',
            type: 2,
            data: {
                id: 'c1',
                type: ApplicationCommandType.Message,
                target_id: 'm1',
                resolved: { messages: { m1: message } }
            }
        } as unknown as APIMessageApplicationCommandInteraction;
    }

    it('resolves the right-clicked user and its member on a user menu', async () => {
        let target: APIUser | null = null;
        let nick: string | null | undefined;
        class Profile extends UserContextMenuHandler<never> {
            execute(): Promise<void> {
                target = this.target;
                nick = this.targetMember?.nick;
                return Promise.resolve();
            }
        }

        await built(
            Profile,
            userMenuEvent(),
            coreMock().core,
            new DispatchContext('userContextMenu', 'View Profile')
        ).execute();

        expect(target).toEqual(user);
        expect(nick).toBe('nick');
    });

    it('resolves the right-clicked message on a message menu', async () => {
        let target: APIMessage | null = null;
        class Report extends MessageContextMenuHandler<never> {
            execute(): Promise<void> {
                target = this.target;
                expectTypeOf(this.target).toEqualTypeOf<APIMessage>();
                return Promise.resolve();
            }
        }

        await built(
            Report,
            messageMenuEvent(),
            coreMock().core,
            new DispatchContext('messageContextMenu', 'Report Message')
        ).execute();

        expect(target).toEqual(message);
    });
});
