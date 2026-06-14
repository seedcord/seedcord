import { ContainerBuilder, DiscordAPIError, EmbedBuilder, MessageFlags, RESTJSONErrorCodes } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReplySender } from '@bot/ReplySender';

import type { Repliables } from '@handlers/BaseHandler';
import type { ReplyResponse } from '@seedcord/types';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inference is fine this
function mockInteraction() {
    return {
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
        followUp: vi.fn().mockResolvedValue(undefined),
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

const embed: ReplyResponse = { kind: 'embed', embeds: [new EmbedBuilder().setDescription('nope')] };
const v2: ReplyResponse = { kind: 'v2', components: [new ContainerBuilder()] };

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

    it('replies on a fresh interaction', async () => {
        await senderFor(mock).send(embed);
        expect(mock.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
        expect(mock.editReply).not.toHaveBeenCalled();
        expect(mock.followUp).not.toHaveBeenCalled();
    });

    it('edits the reply on a deferred interaction', async () => {
        mock.deferred = true;
        await senderFor(mock).send(embed);
        expect(mock.editReply).toHaveBeenCalledTimes(1);
        expect(mock.reply).not.toHaveBeenCalled();
        expect(mock.followUp).not.toHaveBeenCalled();
    });

    it('follows up on an already-replied interaction', async () => {
        mock.replied = true;
        await senderFor(mock).send(embed);
        expect(mock.followUp).toHaveBeenCalledTimes(1);
        expect(mock.reply).not.toHaveBeenCalled();
        expect(mock.editReply).not.toHaveBeenCalled();
    });

    it('follows up a fresh v2 message after a classic defer and clears the stale defer', async () => {
        mock.deferred = true;
        await senderFor(mock).send(v2);
        expect(mock.followUp).toHaveBeenCalledWith(
            expect.objectContaining({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 })
        );
        expect(mock.deleteReply).toHaveBeenCalledTimes(1);
        expect(mock.editReply).not.toHaveBeenCalled();
    });

    it('never edits or deletes the source message of a deferred message-component interaction', async () => {
        // a button/select deferUpdate() leaves @original pointing at the live source message, so editReply
        // would overwrite it and deleteReply would destroy it. The error must go to a fresh followUp.
        mock.deferred = true;
        mock.isMessageComponent.mockReturnValue(true);

        await senderFor(mock).send(embed);
        await senderFor(mock).send(v2);

        expect(mock.followUp).toHaveBeenCalledTimes(2);
        expect(mock.editReply).not.toHaveBeenCalled();
        expect(mock.deleteReply).not.toHaveBeenCalled();
    });

    it('swallows a harmless send failure instead of letting it escape', async () => {
        mock.reply.mockRejectedValueOnce(harmlessError());
        await expect(senderFor(mock).send(embed)).resolves.toBeUndefined();
        expect(mock.reply).toHaveBeenCalledTimes(1);
    });

    it('swallows an unexpected send failure instead of letting it escape', async () => {
        mock.reply.mockRejectedValueOnce(new Error('network down'));
        await expect(senderFor(mock).send(embed)).resolves.toBeUndefined();
    });
});
