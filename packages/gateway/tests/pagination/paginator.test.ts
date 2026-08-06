import { ButtonRoute } from '@seedcord/core';
import {
    ComponentDefsKey,
    InteractionMetadataKey,
    InteractionRouteKeys,
    InteractionRoutes,
    PublishDefault
} from '@seedcord/core/internal';
import { ComponentType, MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { ReplySender } from '@bot/ReplySender';
import { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import { Paginator } from '@pagination/Paginator';
import { ArraySource } from '@pagination/sources';

import { stubBus } from '../utils/stubBus';

import type { RepliableHandler } from '@handlers/RepliableHandler';
import type { Core } from '@interfaces/Core';
import type { PageContext } from '@pagination/PageContext';
import type { Repliables } from '@src/handlers/interactionTypes';
import type { APIContainerComponent, ButtonInteraction } from 'discord.js';

// justified: the paginator reads the interaction and the bus every write reports on
const core = { bus: stubBus() } as unknown as Core;
const letters = ['a', 'b', 'c', 'd', 'e'];

const pager = new Paginator({
    prefix: 'bans',
    source: new ArraySource(() => letters, { perPage: 2 }),
    renderItem: (letter) => letter
});

@ButtonRoute(pager.cursor)
class BansNav extends pager.Handler {}

// a paginator whose loader records the context the Paginator builds, to pin the DM guild-null threading.
const seenContexts: PageContext[] = [];
const Reminders = new Paginator({
    prefix: 'reminders',
    source: new ArraySource((ctx) => {
        seenContexts.push(ctx);
        return letters;
    }),
    renderItem: (letter) => letter
});

@ButtonRoute(Reminders.cursor)
class RemindersNav extends Reminders.Handler {}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine for the mock
function startEvent() {
    return {
        id: 'i1',
        reply: vi.fn().mockResolvedValue({ resource: { message: { id: 'page-message' } } }),
        deferReply: vi.fn().mockResolvedValue(undefined),
        followUp: vi.fn().mockResolvedValue({ id: 'page-message' }),
        user: { id: 'u1' },
        guild: null,
        replied: false,
        deferred: false,
        ephemeral: null as boolean | null,
        isChatInputCommand: () => true,
        isContextMenuCommand: () => false,
        isButton: () => false,
        isAnySelectMenu: () => false,
        isMessageComponent: () => false,
        isModalSubmit: () => false,
        isFromMessage: () => false,
        commandName: 'page',
        options: { getSubcommand: () => null, getSubcommandGroup: () => null }
    };
}

// the sender reads the interaction's unacked flags, so this.deferUpdate() sets deferred-update
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine for the mock
function navEvent(customId: string) {
    return {
        customId,
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue({ id: 'paged-message' }),
        message: { id: 'paged-message' },
        webhook: { editMessage: vi.fn().mockResolvedValue(undefined) },
        user: { id: 'u1' },
        guild: null,
        deferred: false,
        replied: false,
        ephemeral: null as boolean | null,
        isChatInputCommand: () => false,
        isContextMenuCommand: () => false,
        isButton: () => true,
        isAnySelectMenu: () => false,
        isMessageComponent: () => true,
        isModalSubmit: () => false,
        isFromMessage: () => false
    };
}

// justified: each fixture implements only the interaction surface the paginator reads
function asRepliable(event: ReturnType<typeof startEvent>): Repliables {
    return event as unknown as Repliables;
}
function asButton(event: ReturnType<typeof navEvent>): ButtonInteraction<'cached'> {
    return event as unknown as ButtonInteraction<'cached'>;
}

function containerText(components: { toJSON(): unknown }[]): string {
    const json = components[0]?.toJSON() as APIContainerComponent;
    return json.components.reduce<string>(
        (acc, part) => (part.type === ComponentType.TextDisplay ? acc + part.content : acc),
        ''
    );
}

// the sender serializes each component before the wire call, so sent components arrive as raw API data
function sentContainerText(components: unknown[]): string {
    const json = components[0] as APIContainerComponent;
    return json.components.reduce<string>(
        (acc, part) => (part.type === ComponentType.TextDisplay ? acc + part.content : acc),
        ''
    );
}

// justified: start only reads core.bus for telemetry and threads core into the page context
function stubCore(): Core {
    return { bus: { [PublishDefault]: () => true } } as unknown as Core;
}

// start reads the route id off the handler's sender, so the fixture builds a real one
function stubHandler(event: ReturnType<typeof startEvent>): RepliableHandler<Repliables> {
    const interaction = asRepliable(event);
    const core = stubCore();
    const sender = new ReplySender(interaction, 'slash:page', core.bus);
    // justified: start reads only these three members off the handler
    return { core, getEvent: () => interaction, getSender: () => sender } as unknown as RepliableHandler<Repliables>;
}

describe('Paginator.start', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders page 0 and sends it with the components-v2 flag', async () => {
        const event = startEvent();
        await pager.start(stubHandler(event));

        expect(event.reply).toHaveBeenCalledOnce();
        const options = event.reply.mock.calls[0]?.[0] as { components: unknown[]; flags: number };
        expect(options.flags & MessageFlags.IsComponentsV2).toBeTruthy();
        expect(options.flags & MessageFlags.Ephemeral).toBeFalsy();
        expect(sentContainerText(options.components)).toBe('a\nb');
    });

    it('rejects when the page-0 send fails', async () => {
        const failure = new Error('discord api error');
        const event = startEvent();
        event.reply.mockRejectedValue(failure);

        await expect(pager.start(stubHandler(event))).rejects.toBe(failure);
    });

    it('honors an ephemeral paginator', async () => {
        const ephemeral = new Paginator({
            prefix: 'invites',
            source: new ArraySource(() => letters, { perPage: 2 }),
            renderItem: (letter) => letter,
            ephemeral: true
        });
        const event = startEvent();
        await ephemeral.start(stubHandler(event));
        const options = event.reply.mock.calls[0]?.[0] as { flags: number };
        expect(options.flags & MessageFlags.Ephemeral).toBeTruthy();
    });
});

describe('Paginator.page', () => {
    it('renders the requested page as a ReplyResponse', async () => {
        // justified: page() reads no field off the context, only forwards it to the source loader
        const ctx = { interaction: {}, user: {}, guild: null } as unknown as PageContext;
        const reply = await pager.page(ctx, 1);
        expect(containerText(reply.components)).toBe('c\nd');
    });
});

describe('Paginator nav handler', () => {
    beforeEach(() => vi.clearAllMocks());

    it('acks, decodes the target page off the wire, and edits @original in place', async () => {
        const event = navEvent(pager.cursor.encode({ page: 2, slot: 0 }));
        await new BansNav(asButton(event), core).execute();

        expect(event.deferUpdate).toHaveBeenCalledOnce();
        // the bare edit rewrites @original (the source message) via editReply in the deferred-update state
        expect(event.editReply).toHaveBeenCalledOnce();
        expect(event.webhook.editMessage).not.toHaveBeenCalled();
        const body = event.editReply.mock.calls[0]?.[0] as { components: unknown[]; flags: number };
        expect(body.flags).toBe(MessageFlags.IsComponentsV2);
        expect(sentContainerText(body.components)).toBe('e'); // page 2 of 5 items at perPage 2
    });
});

describe('Paginator registration', () => {
    it('the decorated .Handler subclass is a discoverable InteractionHandler routed by the cursor prefix', () => {
        expect(BansNav.prototype).toBeInstanceOf(InteractionHandler);
        expect(Reflect.hasMetadata(InteractionMetadataKey, BansNav)).toBe(true);
        const routeKeys = Reflect.getMetadata(InteractionRouteKeys[InteractionRoutes.Button], BansNav) as string[];
        expect(routeKeys).toContain(pager.cursor.prefix);
        const defs = Reflect.getMetadata(ComponentDefsKey, BansNav) as unknown[];
        expect(defs).toContain(pager.cursor);
    });
});

describe('Paginator context', () => {
    it('threads the interaction user and guild (DM null) into the PageContext it builds', async () => {
        seenContexts.length = 0;
        const event = navEvent(Reminders.cursor.encode({ page: 0, slot: 0 }));
        await new RemindersNav(asButton(event), core).execute();

        const ctx = seenContexts[0];
        expect(ctx?.interaction).toBe(event);
        expect(ctx?.user).toBe(event.user);
        expect(ctx?.guild).toBeNull();
    });
});

describe('Paginator typing', () => {
    it('infers the item type from the source into renderItem', () => {
        const nums = new Paginator({
            prefix: 'nums',
            source: new ArraySource(() => [1, 2, 3]),
            renderItem: (item) => {
                expectTypeOf(item).toEqualTypeOf<number>();
                return String(item);
            }
        });
        expect(nums.cursor.prefix).toBe('nums');
    });
});
