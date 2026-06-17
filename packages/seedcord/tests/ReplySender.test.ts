import { ContainerBuilder, DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReplySender } from '@bot/ReplySender';

import type { Repliables } from '@handlers/BaseHandler';
import type { ReplyResponse } from '@seedcord/types';

const sentMessage = { id: 'sent-message' };

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine here
function mockInteraction() {
    return {
        reply: vi.fn().mockResolvedValue(undefined),
        fetchReply: vi.fn().mockResolvedValue(sentMessage),
        editReply: vi.fn().mockResolvedValue(sentMessage),
        followUp: vi.fn().mockResolvedValue(sentMessage),
        deleteReply: vi.fn().mockResolvedValue(undefined),
        isMessageComponent: vi.fn().mockReturnValue(false),
        isModalSubmit: vi.fn().mockReturnValue(false),
        deferred: false,
        replied: false
    };
}

// justified: the fixture implements only the Repliables surface ReplySender reads.
function senderFor(mock: ReturnType<typeof mockInteraction>): ReplySender {
    return new ReplySender(mock as unknown as Repliables);
}

const reply: ReplyResponse = { components: [new ContainerBuilder()] };
const V2_EPHEMERAL = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;

function harmlessError(): DiscordAPIError {
    return new DiscordAPIError(
        { code: RESTJSONErrorCodes.UnknownInteraction, message: 'Unknown interaction' },
        RESTJSONErrorCodes.UnknownInteraction,
        404,
        'POST',
        'https://discord.com/api/interactions/x/y/callback',
        { body: undefined, files: [] }
    );
}

describe('ReplySender', () => {
    let mock: ReturnType<typeof mockInteraction>;

    beforeEach(() => {
        mock = mockInteraction();
    });

    it('replies with the components-v2 flag and the components on a fresh interaction', async () => {
        await senderFor(mock).send(reply);
        expect(mock.reply).toHaveBeenCalledWith(
            expect.objectContaining({ components: reply.components, flags: V2_EPHEMERAL })
        );
        expect(mock.editReply).not.toHaveBeenCalled();
        expect(mock.followUp).not.toHaveBeenCalled();
    });

    it('follows up and clears the stale thinking defer on a deferred slash interaction', async () => {
        // a slash deferReply leaves a throwaway "thinking" placeholder. editReply cannot turn it into a
        // ComponentsV2 message (50035), so the sender follows up fresh and deletes the placeholder.
        mock.deferred = true;
        await senderFor(mock).send(reply);
        expect(mock.followUp).toHaveBeenCalledWith(expect.objectContaining({ flags: V2_EPHEMERAL }));
        expect(mock.deleteReply).toHaveBeenCalledTimes(1);
        expect(mock.editReply).not.toHaveBeenCalled();
    });

    it('follows up on an already-replied interaction', async () => {
        mock.replied = true;
        await senderFor(mock).send(reply);
        expect(mock.followUp).toHaveBeenCalledTimes(1);
        expect(mock.reply).not.toHaveBeenCalled();
        expect(mock.editReply).not.toHaveBeenCalled();
    });

    it('follows up without touching the source message of a deferred component interaction', async () => {
        // a button/select deferUpdate() leaves @original pointing at the live source message, so editReply
        // would overwrite it and deleteReply would destroy it. The reply must go to a fresh followUp.
        mock.deferred = true;
        mock.isMessageComponent.mockReturnValue(true);

        await senderFor(mock).send(reply);

        expect(mock.followUp).toHaveBeenCalledTimes(1);
        expect(mock.editReply).not.toHaveBeenCalled();
        expect(mock.deleteReply).not.toHaveBeenCalled();
    });

    it('returns the sent message so a caller can attach a collector', async () => {
        await expect(senderFor(mock).send(reply)).resolves.toBe(sentMessage);
    });

    it('returns undefined when the send is swallowed', async () => {
        mock.reply.mockRejectedValueOnce(harmlessError());
        await expect(senderFor(mock).send(reply)).resolves.toBeUndefined();
    });

    it('swallows a harmless send failure instead of letting it escape', async () => {
        mock.reply.mockRejectedValueOnce(harmlessError());
        await expect(senderFor(mock).send(reply)).resolves.toBeUndefined();
        expect(mock.reply).toHaveBeenCalledTimes(1);
    });

    it('swallows an unexpected send failure instead of letting it escape', async () => {
        mock.reply.mockRejectedValueOnce(new Error('network down'));
        await expect(senderFor(mock).send(reply)).resolves.toBeUndefined();
    });
});
