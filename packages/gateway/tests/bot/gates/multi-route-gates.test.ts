import { CustomId, InteractionKind } from '@seedcord/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { interactionsOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { TestEnvironment } from '#tests/utils/test-env';

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

describe('a handler registered on two routes', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    async function bootWithVote(): Promise<{
        controller: PrivateInteractionDispatcher;
        published: SubscriptionData<'interactionDispatched'>[];
    }> {
        await testEnv.createFile('interactions/Vote.ts', HANDLER_SOURCE);
        seedcord = new Seedcord(testConfig({ interactions: testEnv.resolvePath('interactions') }));
        const controller = controllerOf(seedcord);
        await controller.init();

        const published: SubscriptionData<'interactionDispatched'>[] = [];
        seedcord.bus.on('interactionDispatched', (payload) => published.push(payload));
        return { controller, published };
    }

    beforeEach(async () => {
        // @ts-expect-error the reset hook is private
        Seedcord.reset();
        testEnv = new TestEnvironment('multi-route-gates-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.restoreAllMocks();
    });

    it('registers the handler under each of its routes', async () => {
        const { controller } = await bootWithVote();

        expect(controller.maps[InteractionKind.Button].has(Confirm.prefix)).toBe(true);
        expect(controller.maps[InteractionKind.Button].has(Cancel.prefix)).toBe(true);
    });

    it('reports the clicked route as the dispatch id', async () => {
        const { controller, published } = await bootWithVote();

        await controller.handleButton(fakeButton(Confirm.encode({})));
        await controller.handleButton(fakeButton(Cancel.encode({})));

        expect(published.map((entry) => entry.routeId)).toEqual(['button:confirm', 'button:cancel']);
    });

    it('cools down each route on its own', async () => {
        const { controller, published } = await bootWithVote();

        await controller.handleButton(fakeButton(Confirm.encode({})));
        await controller.handleButton(fakeButton(Cancel.encode({})));

        expect(published.map((entry) => entry.outcome)).toEqual(['handled', 'handled']);
    });

    it('still refuses a second click on the route that was already used', async () => {
        const { controller, published } = await bootWithVote();

        await controller.handleButton(fakeButton(Confirm.encode({})));
        await controller.handleButton(fakeButton(Confirm.encode({})));

        expect(published.map((entry) => entry.outcome)).toEqual(['handled', 'refused']);
    });
});
