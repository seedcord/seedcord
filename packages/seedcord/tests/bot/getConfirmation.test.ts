import { ContainerBuilder } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getConfirmation } from '@bot/confirm';
import { CONFIRM_DEF } from '@bot/confirm/reserved';

import type { DefaultConfirmOptions } from '@bot/confirm';
import type { NonModalInteraction } from '@bot/gates/Gate';
import type { ReplyResponse } from '@seedcord/types';
import type { ButtonInteraction, ModalSubmitInteraction } from 'discord.js';

type Prompt = string | ((ids: { confirm: string; cancel: string }) => ReplyResponse);

const confirmWire = CONFIRM_DEF.encode({ choice: 'confirm' });
const cancelWire = CONFIRM_DEF.encode({ choice: 'cancel' });

const mockMessage = { id: 'prompt-message', awaitMessageComponent: vi.fn() };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function mockEvent() {
    return {
        reply: vi.fn().mockResolvedValue(undefined),
        fetchReply: vi.fn().mockResolvedValue(mockMessage),
        editReply: vi.fn().mockResolvedValue(mockMessage),
        followUp: vi.fn().mockResolvedValue(mockMessage),
        deleteReply: vi.fn().mockResolvedValue(undefined),
        webhook: { editMessage: vi.fn().mockResolvedValue(undefined) },
        isMessageComponent: () => false,
        isModalSubmit: () => false,
        user: { id: 'u1' },
        deferred: false,
        replied: false
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function winner(customId: string, userId = 'u1') {
    return { customId, user: { id: userId }, deferUpdate: vi.fn().mockResolvedValue(undefined) };
}

const v2Prompt = (): ReplyResponse => ({ components: [new ContainerBuilder()] });
const outcomeCard: ReplyResponse = { components: [new ContainerBuilder()] };

describe('getConfirmation', () => {
    let event: ReturnType<typeof mockEvent>;

    beforeEach(() => {
        vi.clearAllMocks();
        event = mockEvent();
        mockMessage.awaitMessageComponent.mockResolvedValue(winner(confirmWire));
    });

    // justified: the fixture implements only the interaction surface getConfirmation reads, and the cast
    // collapses the overloads so the helper can forward either a string or a factory prompt.
    const run = (prompt: Prompt, options?: DefaultConfirmOptions): Promise<boolean> =>
        (getConfirmation as (i: NonModalInteraction, p: Prompt, o?: DefaultConfirmOptions) => Promise<boolean>)(
            event as unknown as NonModalInteraction,
            prompt,
            options
        );

    it('resolves true when the user confirms', async () => {
        await expect(run(v2Prompt)).resolves.toBe(true);
        expect(mockMessage.awaitMessageComponent).toHaveBeenCalledTimes(1);
    });

    it('resolves false and removes the prompt when the user cancels', async () => {
        mockMessage.awaitMessageComponent.mockResolvedValue(winner(cancelWire));
        await expect(run(v2Prompt)).resolves.toBe(false);
        expect(event.deleteReply).toHaveBeenCalledWith(mockMessage);
        expect(event.webhook.editMessage).not.toHaveBeenCalled();
    });

    it('resolves false and removes the prompt on timeout', async () => {
        mockMessage.awaitMessageComponent.mockRejectedValue(new Error('timed out'));
        await expect(run(v2Prompt)).resolves.toBe(false);
        expect(event.deleteReply).toHaveBeenCalledWith(mockMessage);
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

    it('resolves false when the prompt send is swallowed', async () => {
        event.reply.mockRejectedValue(new Error('send failed'));
        await expect(run(v2Prompt)).resolves.toBe(false);
        expect(mockMessage.awaitMessageComponent).not.toHaveBeenCalled();
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
            mockMessage,
            expect.objectContaining({ components: outcomeCard.components })
        );
        expect(event.deleteReply).not.toHaveBeenCalled();
    });

    it('edits the prompt to onCancel on a cancel click', async () => {
        mockMessage.awaitMessageComponent.mockResolvedValue(winner(cancelWire));
        await run(v2Prompt, { onCancel: outcomeCard });
        expect(event.webhook.editMessage).toHaveBeenCalledWith(
            mockMessage,
            expect.objectContaining({ components: outcomeCard.components })
        );
    });

    it('edits the prompt to onTimeout on a timeout', async () => {
        mockMessage.awaitMessageComponent.mockRejectedValue(new Error('timed out'));
        await run(v2Prompt, { onTimeout: () => outcomeCard });
        expect(event.webhook.editMessage).toHaveBeenCalledWith(
            mockMessage,
            expect.objectContaining({ components: outcomeCard.components })
        );
    });

    it('runs concurrent prompts independently, each resolving on its own message', async () => {
        function flow(winnerWire: string, userId: string): Promise<boolean> {
            const message = {
                id: `msg-${userId}`,
                awaitMessageComponent: vi.fn().mockResolvedValue(winner(winnerWire, userId))
            };
            const ev = { ...mockEvent(), user: { id: userId }, fetchReply: vi.fn().mockResolvedValue(message) };
            return getConfirmation(ev as unknown as NonModalInteraction, v2Prompt);
        }
        const [a, b] = await Promise.all([flow(confirmWire, 'userA'), flow(cancelWire, 'userB')]);
        expect(a).toBe(true);
        expect(b).toBe(false);
    });
});

// type-level checks, validated by tc. the runtime body only anchors the file.
describe('getConfirmation typing', () => {
    it('accepts a non-modal interaction and rejects a modal submit', () => {
        function probe(button: ButtonInteraction, modal: ModalSubmitInteraction): void {
            void getConfirmation(button, 'sure?');
            void getConfirmation(button, () => ({ components: [new ContainerBuilder()] }), {
                onConfirm: { components: [new ContainerBuilder()] }
            });
            // @ts-expect-error getConfirmation excludes a modal-submit interaction
            void getConfirmation(modal, 'sure?');
        }

        expect(probe).toBeTypeOf('function');
    });
});
