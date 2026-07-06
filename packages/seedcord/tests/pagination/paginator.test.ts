import 'reflect-metadata';

import {
    ComponentDefsKey,
    InteractionMetadataKey,
    InteractionRouteKeys,
    InteractionRoutes
} from '@seedcord/core/internal';
import { ComponentType, MessageFlags } from 'discord.js';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { ButtonRoute } from '@bDecorators/Interactions';
import { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import { Paginator } from '@pagination/Paginator';
import { ArraySource } from '@pagination/sources';

import type { Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { PageContext } from '@pagination/PageContext';
import type { APIContainerComponent, ButtonInteraction } from 'discord.js';

const core = {} as unknown as Core;
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
        reply: vi.fn().mockResolvedValue(undefined),
        fetchReply: vi.fn().mockResolvedValue({ id: 'page-message' }),
        followUp: vi.fn().mockResolvedValue({ id: 'page-message' }),
        user: { id: 'u1' },
        guild: null,
        replied: false,
        deferred: false,
        isMessageComponent: () => false,
        isModalSubmit: () => false
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine for the mock
function navEvent(customId: string) {
    return {
        customId,
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        message: { id: 'paged-message' },
        webhook: { editMessage: vi.fn().mockResolvedValue(undefined) },
        user: { id: 'u1' },
        guild: null
    };
}

function containerText(components: { toJSON(): unknown }[]): string {
    const json = components[0]?.toJSON() as APIContainerComponent;
    return json.components.reduce<string>(
        (acc, part) => (part.type === ComponentType.TextDisplay ? acc + part.content : acc),
        ''
    );
}

describe('Paginator.start', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders page 0 and sends it with the components-v2 flag', async () => {
        const event = startEvent();
        await pager.start(event as unknown as Repliables);

        expect(event.reply).toHaveBeenCalledOnce();
        const options = event.reply.mock.calls[0]?.[0] as { components: { toJSON(): unknown }[]; flags: number };
        expect(options.flags & MessageFlags.IsComponentsV2).toBeTruthy();
        expect(options.flags & MessageFlags.Ephemeral).toBeFalsy();
        expect(containerText(options.components)).toBe('a\nb');
    });

    it('honors an ephemeral paginator', async () => {
        const ephemeral = new Paginator({
            prefix: 'invites',
            source: new ArraySource(() => letters, { perPage: 2 }),
            renderItem: (letter) => letter,
            ephemeral: true
        });
        const event = startEvent();
        await ephemeral.start(event as unknown as Repliables);
        const options = event.reply.mock.calls[0]?.[0] as { flags: number };
        expect(options.flags & MessageFlags.Ephemeral).toBeTruthy();
    });
});

describe('Paginator.page', () => {
    it('renders the requested page as a ReplyResponse', async () => {
        const ctx = { interaction: {}, user: {}, guild: null } as unknown as PageContext;
        const reply = await pager.page(ctx, 1);
        expect(containerText(reply.components)).toBe('c\nd');
    });
});

describe('Paginator nav handler', () => {
    beforeEach(() => vi.clearAllMocks());

    it('acks, decodes the target page off the wire, and edits the message in place', async () => {
        const event = navEvent(pager.cursor.encode({ page: 2, slot: 0 }));
        await new BansNav(event as unknown as ButtonInteraction<'cached'>, core).execute();

        expect(event.deferUpdate).toHaveBeenCalledOnce();
        expect(event.webhook.editMessage).toHaveBeenCalledOnce();
        const [message, body] = event.webhook.editMessage.mock.calls[0] as [
            unknown,
            { components: { toJSON(): unknown }[]; flags: number }
        ];
        expect(message).toBe(event.message);
        expect(body.flags).toBe(MessageFlags.IsComponentsV2);
        expect(containerText(body.components)).toBe('e'); // page 2 of 5 items at perPage 2
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
        await new RemindersNav(event as unknown as ButtonInteraction<'cached'>, core).execute();

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
