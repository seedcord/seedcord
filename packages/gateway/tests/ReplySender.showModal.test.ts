import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { mockInteraction, senderFor } from './utils/senderMock';

import type { ModalLike } from '@seedcord/core/internal';

const feedbackModal = (): ModalLike => ({ toJSON: () => ({ title: 'Feedback', custom_id: 'fb', components: [] }) });

describe('ReplySender.showModal', () => {
    it('passes the raw modal data to showModal and advances to replied', async () => {
        const mock = mockInteraction();

        await senderFor(mock).showModal(feedbackModal());

        expect(mock.showModal).toHaveBeenCalledWith({ title: 'Feedback', custom_id: 'fb', components: [] });
    });

    it('throws ReplyIllegalAckState after a defer, before any djs call', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();

        await expect(sender.showModal(feedbackModal())).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.showModal).not.toHaveBeenCalled();
    });

    it('throws ReplyIllegalAckState after a deferUpdate, before any djs call', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.deferUpdate();

        await expect(sender.showModal(feedbackModal())).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.showModal).not.toHaveBeenCalled();
    });

    it('labels a null-prototype modal as modal in the translated error', async () => {
        const mock = mockInteraction();
        // justified: a null-prototype object has no constructor, the label fallback path under test
        const modal = Object.create(null) as { toJSON(): never };
        modal.toJSON = () => {
            throw new RangeError('Modal title must be 1-45 characters.');
        };

        try {
            await senderFor(mock).showModal(modal);
            expect.unreachable('showModal should throw');
        } catch (error) {
            if (!isSeedcordError(error)) throw error;
            expect(error.message).toContain('modal');
        }
        expect(mock.showModal).not.toHaveBeenCalled();
    });

    it('translates a modal toJSON throw before any djs call', async () => {
        const mock = mockInteraction();
        class FeedbackModal {
            toJSON(): never {
                throw new RangeError('Modal title must be 1-45 characters.');
            }
        }

        try {
            await senderFor(mock).showModal(new FeedbackModal());
            expect.unreachable('showModal should throw');
        } catch (error) {
            expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ReplyComponentSerialization)).toBe(true);
            if (!isSeedcordError(error)) throw error;
            expect(error.message).toContain('FeedbackModal');
            expect(error.message).toContain('Modal title must be 1-45 characters');
            expect(error.cause).toBeInstanceOf(RangeError);
        }
        expect(mock.showModal).not.toHaveBeenCalled();
    });

    it('advances to replied so a later showModal throws', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.showModal(feedbackModal());

        await expect(sender.showModal(feedbackModal())).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.showModal).toHaveBeenCalledOnce();
    });

    it('throws before any djs call when the interaction is a modal submit', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: true });

        await expect(senderFor(mock).showModal(feedbackModal())).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.showModal).not.toHaveBeenCalled();
    });
});
