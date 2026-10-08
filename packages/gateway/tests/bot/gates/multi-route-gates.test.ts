import { CustomId, InteractionKind } from '@seedcord/core';
import { afterEach, describe, expect, vi } from 'vitest';

import { interactionsOf } from '#bot/Bot';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { Seedcord } from '#src/Seedcord';
import type { SubscriptionData } from '@seedcord/core';

import '#tests/utils/mock-env';

interface PrivateInteractionDispatcher {
    maps: Record<InteractionKind, Map<string, unknown>>;
    init(): Promise<void>;
    handleButton(interaction: unknown): Promise<void>;
}

// justified: the route maps and the button entry point are private on the dispatcher
function controllerOf(instance: Seedcord): PrivateInteractionDispatcher {
    return interactionsOf(instance.bot) as unknown as PrivateInteractionDispatcher;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- an explicit return type would repeat the literal below
function fakeButton(customId: string) {
    return {
        customId,
        reply: vi.fn().mockResolvedValue({ resource: { message: { id: 'm-1' } } }),
        deferReply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue({ id: 'm-1' }),
        followUp: vi.fn().mockResolvedValue(undefined),
        isAutocomplete: () => false,
        isChatInputCommand: () => false,
        isContextMenuCommand: () => false,
        isButton: () => true,
        isAnySelectMenu: () => false,
        isModalSubmit: () => false,
        user: { id: 'u1' },
        member: null,
        guild: null,
        guildId: 'g1',
        channelId: 'c1',
        memberPermissions: null,
        appPermissions: { bitfield: 0n },
        id: 'i1',
        deferred: false,
        replied: false
    };
}

const Confirm = new CustomId('confirm');
const Cancel = new CustomId('cancel');

const HANDLER_SOURCE = `
import { ButtonHandler, ButtonRoute, Cooldown, CustomId, Gated } from '${seedcordPath}';

const Confirm = new CustomId('confirm');
const Cancel = new CustomId('cancel');

@ButtonRoute(Confirm, Cancel)
@Gated(Cooldown('10s'))
export class Vote extends ButtonHandler<[typeof Confirm, typeof Cancel]> {
    public async execute() {
        await this.reply('counted');
    }
}
`;

interface VoteBot {
    controller: PrivateInteractionDispatcher;
    published: SubscriptionData<'interactionDispatched'>[];
}

const withVote = it.extend<{ vote: VoteBot }>({
    vote: async ({ testEnv, seedcordWith }, use) => {
        await testEnv.createFile('interactions/Vote.ts', HANDLER_SOURCE);
        const seedcord = seedcordWith(testConfig({ interactions: testEnv.resolvePath('interactions') }));
        const controller = controllerOf(seedcord);
        await controller.init();

        const published: SubscriptionData<'interactionDispatched'>[] = [];
        seedcord.bus.on('interactionDispatched', (payload) => published.push(payload));
        await use({ controller, published });
    }
});

describe('a handler registered on two routes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    withVote('registers the handler under each of its routes', ({ vote }) => {
        const { controller } = vote;

        expect(controller.maps[InteractionKind.Button].has(Confirm.prefix)).toBe(true);
        expect(controller.maps[InteractionKind.Button].has(Cancel.prefix)).toBe(true);
    });

    withVote('reports the clicked route as the dispatch id', async ({ vote }) => {
        const { controller, published } = vote;

        await controller.handleButton(fakeButton(Confirm.encode({})));
        await controller.handleButton(fakeButton(Cancel.encode({})));

        expect(published.map((entry) => entry.routeId)).toEqual(['button:confirm', 'button:cancel']);
    });

    withVote('cools down each route on its own', async ({ vote }) => {
        const { controller, published } = vote;

        await controller.handleButton(fakeButton(Confirm.encode({})));
        await controller.handleButton(fakeButton(Cancel.encode({})));

        expect(published.map((entry) => entry.outcome)).toEqual(['handled', 'handled']);
    });

    withVote('still refuses a second click on the route that was already used', async ({ vote }) => {
        const { controller, published } = vote;

        await controller.handleButton(fakeButton(Confirm.encode({})));
        await controller.handleButton(fakeButton(Confirm.encode({})));

        expect(published.map((entry) => entry.outcome)).toEqual(['handled', 'refused']);
    });
});
