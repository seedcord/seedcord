import { ComponentType, InteractionResponseType, MessageFlags } from 'discord-api-types/v10';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { ReplySender } from '#reply/ReplySender';
import { ButtonRoute } from '#src/index';
import { Paginator } from '#src/pagination/Paginator';
import { ArraySource } from '#src/pagination/sources';

import { stubBus } from '../../helpers/fixtures';

import type { RepliableHandler } from '#handlers/RepliableHandler';
import type { Core } from '#interfaces/Core';
import type { InteractionRef } from '#reply/ReplySender';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { PageContext } from '#src/pagination/PageContext';
import type { REST } from '@discordjs/rest';
import type {
    APIComponentInContainer,
    APIContainerComponent,
    APIMessageComponentButtonInteraction
} from 'discord-api-types/v10';

const APP_ID = '111';
const TOKEN = 'tok';
const ref: InteractionRef = { application_id: APP_ID, id: '222', token: TOKEN };
const CALLBACK_ROUTE = `/interactions/222/${TOKEN}/callback`;
const ORIGINAL_ROUTE = `/webhooks/${APP_ID}/${TOKEN}/messages/@original`;

const letters = ['a', 'b', 'c', 'd', 'e'];

function pagerFor(ephemeral?: boolean): Paginator<string, 'letters'> {
    return new Paginator({
        prefix: 'letters',
        source: new ArraySource(() => letters, { perPage: 2 }),
        renderItem: (letter) => letter,
        ...(ephemeral !== undefined && { ephemeral })
    });
}

// the guild payload, the DM arm of contextOf drops member and guild_id for a top-level user
function guildPayload(): Repliables {
    // justified: the paginator reads only the guild id and the acting user off the payload
    return { guild_id: 'g1', member: { user: { id: 'u1' } } } as unknown as Repliables;
}
function dmPayload(): Repliables {
    // justified: same, a DM payload carries neither member nor guild_id
    return { user: { id: 'u2' } } as unknown as Repliables;
}

function stubHandler(post: ReturnType<typeof vi.fn>, interaction = guildPayload()): RepliableHandler<Repliables> {
    const core = { bus: stubBus() } as Core;
    // justified: the fixture implements only the REST surface ReplySender reads
    const sender = new ReplySender(ref, { post } as unknown as REST, 'slash:page', core.bus);
    // justified: start reads only these three members off the handler
    return {
        core,
        getEvent: () => interaction,
        sender
    } as unknown as RepliableHandler<Repliables>;
}

function callbackBody(post: ReturnType<typeof vi.fn>): {
    type?: number;
    data?: { flags?: number; components?: APIContainerComponent[] };
} {
    const call = post.mock.calls.find((args) => args[0] === CALLBACK_ROUTE);
    return (call?.[1] as { body: { type?: number; data?: { flags?: number; components?: APIContainerComponent[] } } })
        .body;
}

function textLines(container?: APIContainerComponent): string[] {
    return (container?.components ?? []).reduce<string[]>((acc, part: APIComponentInContainer) => {
        if (part.type === ComponentType.TextDisplay) acc.push(part.content);
        return acc;
    }, []);
}

describe('http Paginator.start', () => {
    it('sends page 0 with the components-v2 flag', async () => {
        const post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });

        await pagerFor().start(stubHandler(post));

        const { data } = callbackBody(post);
        expect((data?.flags ?? 0) & MessageFlags.IsComponentsV2).toBeTruthy();
        expect((data?.flags ?? 0) & MessageFlags.Ephemeral).toBeFalsy();
        expect(textLines(data?.components?.[0])).toEqual(['a\nb']);
    });

    it('opens on the page it is given', async () => {
        const post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });

        await pagerFor().start(stubHandler(post), 2);

        expect(textLines(callbackBody(post).data?.components?.[0])).toEqual(['e']);
    });

    it('honors an ephemeral paginator', async () => {
        const post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });

        await pagerFor(true).start(stubHandler(post));

        expect((callbackBody(post).data?.flags ?? 0) & MessageFlags.Ephemeral).toBeTruthy();
    });

    it('rejects when the page-0 send fails', async () => {
        const failure = new Error('discord api error');
        const post = vi.fn().mockRejectedValue(failure);

        await expect(pagerFor().start(stubHandler(post))).rejects.toBe(failure);
    });
});

describe('http Paginator.page', () => {
    it('renders the requested page and sends nothing', async () => {
        const post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });

        const reply = await pagerFor().page(stubHandler(post), 1);

        expect(textLines(reply.components[0]?.toJSON() as APIContainerComponent)).toEqual(['c\nd']);
        expect(post).not.toHaveBeenCalled();
    });
});

describe('http Paginator context', () => {
    async function contextFrom(interaction: Repliables): Promise<PageContext> {
        const seen: PageContext[] = [];
        const post = vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } });
        const probe = new Paginator({
            prefix: 'probe',
            source: new ArraySource((ctx) => {
                seen.push(ctx);
                return letters;
            }),
            renderItem: (letter) => letter
        });

        await probe.start(stubHandler(post, interaction));

        const ctx = seen[0];
        if (!ctx) throw new Error('the source loader never ran');
        return ctx;
    }

    it('reads the acting user off member.user in a guild', async () => {
        const ctx = await contextFrom(guildPayload());
        expect(ctx.user.id).toBe('u1');
        expect(ctx.guildId).toBe('g1');
    });

    it('falls back to the top-level user and a null guild id in a DM', async () => {
        const ctx = await contextFrom(dmPayload());
        expect(ctx.user.id).toBe('u2');
        expect(ctx.guildId).toBeNull();
    });
});

describe('http Paginator nav handler', () => {
    const pager = pagerFor();

    @ButtonRoute(pager.cursor)
    class LettersNav extends pager.Handler {}

    function navEvent(customId: string): APIMessageComponentButtonInteraction {
        // justified: the nav path reads the ref fields, data.custom_id, and the guild/user shape
        return {
            ...ref,
            type: 3,
            guild_id: 'g1',
            member: { user: { id: 'u1' } },
            data: { component_type: 2, custom_id: customId }
        } as unknown as APIMessageComponentButtonInteraction;
    }

    it('acks with a deferred update, then rewrites @original with the page off the wire', async () => {
        const post = vi.fn().mockResolvedValue({});
        const patch = vi.fn().mockResolvedValue({ id: 'm-1' });
        // justified: the nav handler reads rest and the bus
        const core = { rest: { post, patch }, bus: stubBus() } as unknown as Core;

        await new LettersNav(navEvent(pager.cursor.encode({ page: 2, slot: 0 })), core).execute();

        expect(post).toHaveBeenCalledOnce();
        expect(post.mock.calls[0]?.[0]).toBe(CALLBACK_ROUTE);
        expect((post.mock.calls[0]?.[1] as { body: { type: number } }).body.type).toBe(
            InteractionResponseType.DeferredMessageUpdate
        );

        expect(patch).toHaveBeenCalledOnce();
        expect(patch.mock.calls[0]?.[0]).toBe(ORIGINAL_ROUTE);
        const body = patch.mock.calls[0]?.[1] as { body: { flags: number; components: APIContainerComponent[] } };
        expect(body.body.flags).toBe(MessageFlags.IsComponentsV2);
        expect(textLines(body.body.components[0])).toEqual(['e']);
    });
});

describe('http Paginator typing', () => {
    it('carries the item type and the http page context through the source subclass', () => {
        const nums = new Paginator({
            prefix: 'nums',
            source: new ArraySource((ctx) => {
                expectTypeOf(ctx).toEqualTypeOf<PageContext>();
                return [1, 2, 3];
            }),
            renderItem: (item) => {
                expectTypeOf(item).toEqualTypeOf<number>();
                return String(item);
            }
        });

        expect(nums.cursor.prefix).toBe('nums');
    });
});
