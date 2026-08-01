import { ContainerBuilder } from '@discordjs/builders';
import { PublishDefault } from '@seedcord/core/internal';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getConfirmation } from '@bot/confirm';
import { CONFIRM_DEF } from '@bot/confirm/reserved';
import { ReplySender } from '@bot/ReplySender';

import type { DefaultConfirmOptions } from '@bot/confirm';
import type { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import type { ModalHandler } from '@handlers/interaction/components/ModalHandler';
import type { Bus } from '@seedcord/core';
import type { ReplyResponse } from '@seedcord/types';
import type { NonModalInteraction } from '@src/handlers/interactionTypes';
import type { RepliableHandler } from '@src/handlers/RepliableHandler';

type Prompt = string | ((ids: { confirm: string; cancel: string }) => ReplyResponse);
// justified: collapses the overloads so one call site can forward either a string or a factory prompt
type ConfirmCall = (
    handler: RepliableHandler<NonModalInteraction>,
    prompt: Prompt,
    options?: DefaultConfirmOptions
) => Promise<boolean>;

const confirmWire = CONFIRM_DEF.encode({ choice: 'confirm' });
const cancelWire = CONFIRM_DEF.encode({ choice: 'cancel' });

const mockMessage = { id: 'prompt-message', awaitMessageComponent: vi.fn() };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function mockEvent() {
    return {
        reply: vi.fn().mockResolvedValue({ resource: { message: mockMessage } }),
        deferReply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(mockMessage),
        followUp: vi.fn().mockResolvedValue(mockMessage),
        deleteReply: vi.fn().mockResolvedValue(undefined),
        webhook: { editMessage: vi.fn().mockResolvedValue(mockMessage) },
        isMessageComponent: () => false,
        isModalSubmit: () => false,
        isFromMessage: () => false,
        isChatInputCommand: () => true,
        isContextMenuCommand: () => false,
        isButton: () => false,
        isAnySelectMenu: () => false,
        commandName: 'confirm-test',
        options: { getSubcommand: () => null, getSubcommandGroup: () => null },
        user: { id: 'u1' },
        deferred: false,
        replied: false,
        ephemeral: null as boolean | null
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function winner(customId: string, userId = 'u1') {
    return { customId, user: { id: userId }, deferUpdate: vi.fn().mockResolvedValue(undefined) };
}

const v2Prompt = (): ReplyResponse => ({ components: [new ContainerBuilder()] });
const outcomeCard: ReplyResponse = { components: [new ContainerBuilder()] };
// the sender serializes each component to raw API data before the wire call
const outcomeComponents = outcomeCard.components.map((c) => c.toJSON());

describe('getConfirmation', () => {
    let event: ReturnType<typeof mockEvent>;

    beforeEach(() => {
        vi.clearAllMocks();
        event = mockEvent();
        mockMessage.awaitMessageComponent.mockResolvedValue(winner(confirmWire));
    });

    // justified: the fixture implements only the surface getConfirmation reads off a handler
    function handlerFor(source: object, routeId = 'confirm-test', bus?: Bus): RepliableHandler<NonModalInteraction> {
        const interaction = source as NonModalInteraction;
        const sender = new ReplySender(interaction, routeId, bus);
        return {
            getEvent: () => interaction,
            getSender: () => sender
        } as unknown as RepliableHandler<NonModalInteraction>;
    }

    const run = (prompt: Prompt, options?: DefaultConfirmOptions): Promise<boolean> =>
        (getConfirmation as ConfirmCall)(handlerFor(event), prompt, options);

    it('sends the prompt through the handler sender, so the publish carries the handler routeId', async () => {
        const publish = vi.fn();
        // justified: the sender reads only the publish slot off the bus
        const bus = { [PublishDefault]: publish } as unknown as Bus;

        await (getConfirmation as ConfirmCall)(handlerFor(event, 'slash:ban', bus), v2Prompt);

        const sent = publish.mock.calls.find(([key]) => key === 'responseAttempted');
        expect(sent?.[1]).toMatchObject({ routeId: 'slash:ban' });
    });

    it('resolves true when the user confirms', async () => {
        await expect(run(v2Prompt)).resolves.toBe(true);
        expect(mockMessage.awaitMessageComponent).toHaveBeenCalledTimes(1);
    });

    it('resolves false and removes the prompt through the sender when the user cancels', async () => {
        mockMessage.awaitMessageComponent.mockResolvedValue(winner(cancelWire));
        await expect(run(v2Prompt)).resolves.toBe(false);
        expect(event.deleteReply).toHaveBeenCalledWith(mockMessage.id);
        expect(event.webhook.editMessage).not.toHaveBeenCalled();
    });

    it('resolves false and removes the prompt through the sender on timeout', async () => {
        mockMessage.awaitMessageComponent.mockRejectedValue(new Error('timed out'));
        await expect(run(v2Prompt)).resolves.toBe(false);
        expect(event.deleteReply).toHaveBeenCalledWith(mockMessage.id);
    });

    it('filters the collector to the invoking user and the reserved confirm ids', async () => {
        await run(v2Prompt);
        const call = mockMessage.awaitMessageComponent.mock.calls[0];
        if (!call) throw new Error('collector was never opened');
        const { filter } = call[0] as { filter: (click: { user: { id: string }; customId: string }) => boolean };
        expect(filter({ user: { id: 'u1' }, customId: confirmWire })).toBe(true);
        expect(filter({ user: { id: 'someone-else' }, customId: confirmWire })).toBe(false);
        expect(filter({ user: { id: 'u1' }, customId: 'foreign:x' })).toBe(false);
    });

    it('rejects when the prompt send fails', async () => {
        const failure = new Error('discord api error');
        event.reply.mockRejectedValue(failure);
        await expect(run(v2Prompt)).rejects.toBe(failure);
        expect(mockMessage.awaitMessageComponent).not.toHaveBeenCalled();
    });

    it('rejects when the settle edit fails', async () => {
        const failure = new Error('discord api error');
        event.webhook.editMessage.mockRejectedValue(failure);
        await expect(run(v2Prompt, { onConfirm: outcomeCard })).rejects.toBe(failure);
    });

    it('builds a default card prompt carrying both reserved buttons for the string form', async () => {
        await run('Are you sure?');
        const payload = event.reply.mock.calls[0]?.[0] as { components?: unknown[] } | undefined;
        expect(payload?.components).toHaveLength(1);
        const serialized = JSON.stringify(payload);
        expect(serialized).toContain(confirmWire);
        expect(serialized).toContain(cancelWire);
    });

    it('applies the convenience-form label overrides', async () => {
        await run('Wipe everything?', { confirmLabel: 'Wipe', cancelLabel: 'Keep' });
        const serialized = JSON.stringify(event.reply.mock.calls[0]?.[0]);
        expect(serialized).toContain('Wipe');
        expect(serialized).toContain('Keep');
    });

    it('edits the prompt to onConfirm on a confirm click instead of removing it', async () => {
        await run(v2Prompt, { onConfirm: outcomeCard });
        expect(event.webhook.editMessage).toHaveBeenCalledWith(
            mockMessage.id,
            expect.objectContaining({ components: outcomeComponents })
        );
        expect(event.deleteReply).not.toHaveBeenCalled();
    });

    it('edits the prompt to onCancel on a cancel click', async () => {
        mockMessage.awaitMessageComponent.mockResolvedValue(winner(cancelWire));
        await run(v2Prompt, { onCancel: outcomeCard });
        expect(event.webhook.editMessage).toHaveBeenCalledWith(
            mockMessage.id,
            expect.objectContaining({ components: outcomeComponents })
        );
    });

    it('edits the prompt to onTimeout on a timeout', async () => {
        mockMessage.awaitMessageComponent.mockRejectedValue(new Error('timed out'));
        await run(v2Prompt, { onTimeout: () => outcomeCard });
        expect(event.webhook.editMessage).toHaveBeenCalledWith(
            mockMessage.id,
            expect.objectContaining({ components: outcomeComponents })
        );
    });

    it('runs concurrent prompts independently, each resolving on its own message', async () => {
        function flow(winnerWire: string, userId: string): Promise<boolean> {
            const message = {
                id: `msg-${userId}`,
                awaitMessageComponent: vi.fn().mockResolvedValue(winner(winnerWire, userId))
            };
            const ev = {
                ...mockEvent(),
                user: { id: userId },
                reply: vi.fn().mockResolvedValue({ resource: { message } })
            };
            return (getConfirmation as ConfirmCall)(handlerFor(ev, `slash:${userId}`), v2Prompt);
        }
        const [a, b] = await Promise.all([flow(confirmWire, 'userA'), flow(cancelWire, 'userB')]);
        expect(a).toBe(true);
        expect(b).toBe(false);
    });
});

// type-level checks, validated by tc. the runtime body only anchors the file.
describe('getConfirmation typing', () => {
    it('accepts a non-modal handler and rejects a modal handler', () => {
        function probe(button: ButtonHandler<never>, modal: ModalHandler<never>): void {
            void getConfirmation(button, 'sure?');
            void getConfirmation(button, () => ({ components: [new ContainerBuilder()] }), {
                onConfirm: { components: [new ContainerBuilder()] }
            });
            // @ts-expect-error getConfirmation excludes a modal handler
            void getConfirmation(modal, 'sure?');
        }

        expect(probe).toBeTypeOf('function');
    });
});
