import 'reflect-metadata';

import { TextDisplayBuilder } from '@discordjs/builders';
import { CustomId, defineGate, Fault, InteractionKind, Notice, RegisterInteractionMiddleware } from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { InteractionType } from 'discord-api-types/v10';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { ButtonHandler } from '#handlers/interaction/components/ButtonHandler';
import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { pluginWithMembers } from '#tests/helpers/pluginWithMembers';
import { restClients } from '#tests/helpers/restClients';

import { capturingCtx, noClasses, readyEngine, routedHandler, signedRequest, slashPayload } from './harness';

import type { BotClasses } from './harness';
import type { DispatchOrigin } from '@seedcord/core';
import type { RenderContext, ReplyResponse } from '@seedcord/types';
import type { UUID } from 'node:crypto';

// these members aren't typed because codegen doesn't run for these test bots
function memberOf(target: object, member = 'tag'): string {
    return String(Reflect.get(target, member));
}

const fromOrigin = (origin: DispatchOrigin): string => `${String(origin.guildId)}:${String(origin.userLocale)}`;

const guildPayload = { ...slashPayload('probe'), guild_id: 'g-1', locale: 'pl' };

async function dispatched(
    classes: BotClasses,
    tag: (origin: DispatchOrigin) => unknown,
    payload: object = guildPayload,
    settings?: Parameters<typeof readyEngine>[1]
): Promise<void> {
    using engine = await readyEngine(classes, {
        ...settings,
        attach: (bot) => bot.attach('tagging', pluginWithMembers({ tag }))
    });
    const ctx = capturingCtx();
    await engine.handle(await signedRequest(engine.signer, payload), ctx);
    await ctx.settled();
}

class CustomCard extends Fault {
    constructor(_uuid: UUID) {
        super();
    }

    public override render(_ctx: RenderContext): ReplyResponse {
        return { components: [new TextDisplayBuilder().setContent('custom card')] };
    }
}

class Refusal extends Notice {
    public constructor() {
        super('refused');
    }

    public override render(_ctx: RenderContext): ReplyResponse {
        return { components: [new TextDisplayBuilder().setContent('refused')] };
    }
}

function repliedText(): string {
    return JSON.stringify(restClients()[0]?.post.mock.calls[0]);
}

beforeEach(() => {
    restClients().length = 0;
});

describe('dispatch members on http', () => {
    it('sets a member before a handler field initializer runs', async () => {
        let seen: string | undefined;
        class Reads extends SlashHandler<never> {
            private readonly tagAtBuild = memberOf(this);

            async execute(): Promise<void> {
                seen = this.tagAtBuild;
                await this.reply('ok');
            }
        }

        await dispatched(routedHandler(InteractionKind.Slash, 'probe', Reads), fromOrigin);

        expect(seen).toBe('g-1:pl');
    });

    it('gives a middleware the same value as its handler from one build', async () => {
        const seen: string[] = [];
        const tag = vi.fn(fromOrigin);
        @RegisterInteractionMiddleware()
        class Audit extends InteractionMiddleware {
            public execute(): void {
                seen.push(memberOf(this));
            }
        }
        class Reads extends SlashHandler<never> {
            async execute(): Promise<void> {
                seen.push(memberOf(this));
                await this.reply('ok');
            }
        }

        await dispatched({ ...routedHandler(InteractionKind.Slash, 'probe', Reads), middleware: [Audit] }, tag);

        expect(seen).toEqual(['g-1:pl', 'g-1:pl']);
        expect(tag).toHaveBeenCalledOnce();
    });

    it('keeps a member that shares its name with a private field of the handler', async () => {
        let seen: unknown;
        class Clicks extends ButtonHandler<never> {
            async execute(): Promise<void> {
                seen = memberOf(this, 'decoded');
                await this.update('ok');
            }
        }
        using engine = await readyEngine(routedHandler(InteractionKind.Button, 'approve', Clicks), {
            attach: (bot) => bot.attach('tagging', pluginWithMembers({ decoded: fromOrigin }))
        });
        const ctx = capturingCtx();
        const payload = {
            type: 3,
            id: 'int-1',
            application_id: 'app-1',
            token: 'tok',
            app_permissions: '0',
            user: { id: 'u1', username: 'tester' },
            guild_id: 'g-1',
            locale: 'pl',
            data: { component_type: 2, custom_id: new CustomId('approve').encode({}) }
        };

        await engine.handle(await signedRequest(engine.signer, payload), ctx);
        await ctx.settled();

        expect(seen).toBe('g-1:pl');
    });

    it('keeps a member that shares its name with the slash handler option cache', async () => {
        let seen: unknown;
        class Reads extends SlashHandler<never> {
            async execute(): Promise<void> {
                seen = memberOf(this, 'resolver');
                await this.reply('ok');
            }
        }
        using engine = await readyEngine(routedHandler(InteractionKind.Slash, 'probe', Reads), {
            attach: (bot) => bot.attach('tagging', pluginWithMembers({ resolver: fromOrigin }))
        });
        const ctx = capturingCtx();

        await engine.handle(await signedRequest(engine.signer, guildPayload), ctx);
        await ctx.settled();

        expect(seen).toBe('g-1:pl');
    });

    it.each([
        {
            kind: 'a method',
            Handler: class extends SlashHandler<never> {
                tag(): string {
                    return 'own';
                }
                execute = vi.fn();
            }
        },
        {
            kind: 'a getter',
            Handler: class extends SlashHandler<never> {
                // eslint-disable-next-line @typescript-eslint/class-literal-property-style -- the getter is the clash this case covers
                get tag(): string {
                    return 'own';
                }
                execute = vi.fn();
            }
        }
    ])('fails startup when a handler has $kind with a member name', async ({ Handler }) => {
        using engine = await readyEngine(routedHandler(InteractionKind.Slash, 'probe', Handler), {
            attach: (bot) => bot.attach('tagging', pluginWithMembers({ tag: fromOrigin }))
        });

        await expect(
            engine.handle(await signedRequest(engine.signer, guildPayload), capturingCtx())
        ).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreDuplicateName
        });
    });

    it('stops the dispatch when a handler field replaces a member', async () => {
        const caught: unknown[] = [];
        const execute = vi.fn();
        class Shadows extends SlashHandler<never> {
            readonly tag = 'own';
            execute = execute;
        }
        using engine = await readyEngine(routedHandler(InteractionKind.Slash, 'probe', Shadows), {
            attach: (bot) => {
                bot.attach('tagging', pluginWithMembers({ tag: fromOrigin }));
                bot.bus.on('unknownException', ({ error }) => caught.push(error));
            }
        });
        const ctx = capturingCtx();

        await engine.handle(await signedRequest(engine.signer, guildPayload), ctx);
        await ctx.settled();

        expect(execute).not.toHaveBeenCalled();
        expect(caught).toEqual([expect.objectContaining({ code: SeedcordErrorCode.CoreDuplicateName })]);
    });

    it('sets a member on an autocomplete handler', async () => {
        let seen: string | undefined;
        class Suggests extends AutocompleteHandler<never> {
            async execute(): Promise<void> {
                seen = memberOf(this);
                await this.respond([]);
            }
        }
        const payload = {
            ...guildPayload,
            type: InteractionType.ApplicationCommandAutocomplete,
            data: { name: 'probe', type: 1, options: [{ name: 'q', type: 3, value: 'x', focused: true }] }
        };

        await dispatched(routedHandler(InteractionKind.Autocomplete, 'probe', Suggests), fromOrigin, payload);

        expect(seen).toBe('g-1:pl');
    });

    it('gives a member to a gate and to the Notice that the gate throws', async () => {
        let seen: string | undefined;
        class Echo extends Notice {
            public constructor() {
                super('echo');
            }

            public override render(ctx: RenderContext): ReplyResponse {
                return { components: [new TextDisplayBuilder().setContent(memberOf(ctx))] };
            }
        }
        const capture = defineGate('capture', (ctx) => {
            seen = memberOf(ctx);
            throw new Echo();
        });
        class Guarded extends SlashHandler<never> {
            execute = vi.fn();
        }
        Reflect.defineMetadata(GatedMetadataKey, [capture], Guarded);

        await dispatched(routedHandler(InteractionKind.Slash, 'probe', Guarded), fromOrigin);

        expect(seen).toBe('g-1:pl');
        expect(repliedText()).toContain('g-1:pl');
    });

    it('builds members for an interaction with no handler', async () => {
        const tag = vi.fn(fromOrigin);

        await dispatched(noClasses(), tag);

        expect(tag).toHaveBeenCalledOnce();
    });

    it.each([
        { thrown: new Error('boom'), kind: 'an error' },
        { thrown: new Refusal(), kind: 'a notice' }
    ])('answers with the built-in card, past defaultError, when a member throws $kind', async ({ thrown }) => {
        const execute = vi.fn();
        class Reads extends SlashHandler<never> {
            execute = execute;
        }

        await dispatched(
            routedHandler(InteractionKind.Slash, 'probe', Reads),
            () => {
                throw thrown;
            },
            guildPayload,
            { settings: { errors: { defaultError: CustomCard } } }
        );

        expect(execute).not.toHaveBeenCalled();
        expect(repliedText()).toContain('Something went wrong');
    });

    it('still uses defaultError when the handler itself throws', async () => {
        class Throws extends SlashHandler<never> {
            execute(): never {
                throw new Error('boom');
            }
        }

        await dispatched(routedHandler(InteractionKind.Slash, 'probe', Throws), fromOrigin, guildPayload, {
            settings: { errors: { defaultError: CustomCard } }
        });

        expect(repliedText()).toContain('custom card');
    });
});
