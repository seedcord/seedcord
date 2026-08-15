import { PublishDefault } from '@seedcord/core/internal';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { ContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

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
    interface SlashOptionRegistry {
        hbBan: {
            reason: { kind: 'string'; required: true };
        };
        hbKick: {
            note: { kind: 'string'; required: false };
        };
        hbSearch: {
            query: { kind: 'string'; required: true; autocomplete: true };
            tag: { kind: 'string'; required: false; autocomplete: true };
            limit: { kind: 'integer'; required: false };
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
            name: 'hbBan',
            options: [{ name: 'reason', type: ApplicationCommandOptionType.String, value: 'spam' }]
        });

        await new Ban(event, coreMock().core).execute();

        expect(seen).toBe('spam');
    });

    it('dispatches the arm for the firing route with its own typed options', async () => {
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
            name: 'hbKick',
            options: [{ name: 'note', type: ApplicationCommandOptionType.String, value: 'bye' }]
        });

        await expect(new Mod(event, coreMock().core).run()).resolves.toBe('kick:bye');
    });

    it('throws SlashMatchArmMissing for a route with no arm', async () => {
        class Ban extends SlashHandler<'hbBan'> {
            async execute(): Promise<void> {
                await this.match({ hbBan: () => undefined });
            }
        }
        const event = slashEvent({ name: 'hbGhost', options: [] });

        await expect(new Ban(event, coreMock().core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.SlashMatchArmMissing)
        );
    });

    it('throws SlashMatchArmMissing for a prototype-named route with no arm', async () => {
        class Ban extends SlashHandler<'hbBan'> {
            async execute(): Promise<void> {
                await this.match({ hbBan: () => undefined });
            }
        }
        const event = slashEvent({ name: 'constructor', options: [] });

        await expect(new Ban(event, coreMock().core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.SlashMatchArmMissing)
        );
    });
});

describe('AutocompleteHandler focused, match, options, route', () => {
    const searchEvent = autoEvent({
        name: 'hbSearch',
        options: [
            { name: 'query', type: ApplicationCommandOptionType.String, value: 'par', focused: true },
            { name: 'limit', type: ApplicationCommandOptionType.Integer, value: '5' }
        ]
    });

    it('exposes the focused field and dispatches its arm through respond', async () => {
        class Search extends AutocompleteHandler<'hbSearch'> {
            async execute(): Promise<void> {
                await this.match({
                    query: (value, respond) => respond([{ name: value, value }]),
                    tag: (value, respond) => respond([{ name: value, value }])
                });
            }
        }
        const { core, post } = coreMock();

        await new Search(searchEvent, core).execute();

        const [route, options] = post.mock.calls[0] as [string, { body: { type: number; data: unknown } }];
        expect(route).toBe('/interactions/int-1/tok/callback');
        expect(options.body).toEqual({ type: 8, data: { choices: [{ name: 'par', value: 'par' }] } });
    });

    it('reads entered siblings and the firing route', async () => {
        let sibling: number | null = null;
        let route = '';
        class Search extends AutocompleteHandler<'hbSearch'> {
            execute(): Promise<void> {
                sibling = this.options.getInteger('limit');
                route = this.route;
                return Promise.resolve();
            }
        }

        await new Search(searchEvent, coreMock().core).execute();

        expect(sibling).toBe(5);
        expect(route).toBe('hbSearch');
    });

    it('throws AutocompleteMatchArmMissing for a focused field with no arm', async () => {
        class Search extends AutocompleteHandler<'hbSearch'> {
            async execute(): Promise<void> {
                await this.match({
                    query: () => undefined,
                    tag: () => undefined
                });
            }
        }
        const event = autoEvent({
            name: 'hbSearch',
            options: [{ name: 'ghost', type: ApplicationCommandOptionType.String, value: 'x', focused: true }]
        });

        await expect(new Search(event, coreMock().core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.AutocompleteMatchArmMissing)
        );
    });

    it('throws AutocompleteMatchArmMissing for a prototype-named focused field', async () => {
        class Search extends AutocompleteHandler<'hbSearch'> {
            async execute(): Promise<void> {
                await this.match({
                    query: () => undefined,
                    tag: () => undefined
                });
            }
        }
        const event = autoEvent({
            name: 'hbSearch',
            options: [{ name: 'constructor', type: ApplicationCommandOptionType.String, value: 'x', focused: true }]
        });

        await expect(new Search(event, coreMock().core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.AutocompleteMatchArmMissing)
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
            name: 'hbSearch',
            options: [{ name: 'limit', type: ApplicationCommandOptionType.Integer, value: '4' }]
        });

        let caught: unknown = null;
        try {
            void new Search(event, coreMock().core).execute();
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
                name: 'View Profile',
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
                name: 'Report Message',
                type: ApplicationCommandType.Message,
                target_id: 'm1',
                resolved: { messages: { m1: message } }
            }
        } as unknown as APIMessageApplicationCommandInteraction;
    }

    it('resolves the right-clicked user and its member on a user menu', async () => {
        let target: APIUser | null = null;
        let nick: string | null | undefined;
        class Profile extends ContextMenuHandler<ApplicationCommandType.User> {
            execute(): Promise<void> {
                target = this.target;
                nick = this.targetMember?.nick;
                return Promise.resolve();
            }
        }

        await new Profile(userMenuEvent(), coreMock().core).execute();

        expect(target).toEqual(user);
        expect(nick).toBe('nick');
    });

    it('resolves the right-clicked message on a message menu', async () => {
        let target: APIMessage | null = null;
        class Report extends ContextMenuHandler<ApplicationCommandType.Message> {
            execute(): Promise<void> {
                target = this.target;
                expectTypeOf(this.target).toEqualTypeOf<APIMessage>();
                expectTypeOf(this.targetMember).toBeNever();
                return Promise.resolve();
            }
        }

        await new Report(messageMenuEvent(), coreMock().core).execute();

        expect(target).toEqual(message);
    });
});
