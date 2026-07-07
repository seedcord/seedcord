import { ContainerBuilder } from '@discordjs/builders';
import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from 'discord.js';
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
        deferred: false,
        replied: false,
        ephemeral: null as boolean | null
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

    it('edits the deferReply placeholder into a components-v2 reply', async () => {
        // deferReply leaves ephemeral a boolean (deferUpdate leaves it null), so editReply upgrades the
        // throwaway placeholder in place with the V2 flag.
        mock.deferred = true;
        mock.ephemeral = false;
        await senderFor(mock).send(reply);
        expect(mock.editReply).toHaveBeenCalledWith(
            expect.objectContaining({ components: reply.components, flags: MessageFlags.IsComponentsV2 })
        );
        expect(mock.followUp).not.toHaveBeenCalled();
        expect(mock.deleteReply).not.toHaveBeenCalled();
    });

    it('keeps the defer ephemerality on a deferReply edit, ignoring the ephemeral argument', async () => {
        // editReply cannot change ephemerality (Discord fixes it at defer time), so the edit body carries
        // only the V2 flag and the send() ephemeral argument has no effect on a deferred interaction.
        mock.deferred = true;
        mock.ephemeral = true;
        await senderFor(mock).send(reply, true);
        const body = mock.editReply.mock.calls[0]?.[0] as { flags: number };
        expect(body.flags).toBe(MessageFlags.IsComponentsV2);
    });

    it('follows up on an already-replied interaction', async () => {
        mock.replied = true;
        await senderFor(mock).send(reply);
        expect(mock.followUp).toHaveBeenCalledTimes(1);
        expect(mock.reply).not.toHaveBeenCalled();
        expect(mock.editReply).not.toHaveBeenCalled();
    });

    it('follows up on a deferUpdate, leaving the source message untouched', async () => {
        // deferUpdate leaves ephemeral null and @original pointing at the live source message, so editing
        // would overwrite it. a fresh follow-up is the non-destructive response.
        mock.deferred = true;
        mock.ephemeral = null;

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

    it('forwards allowedMentions and files into the reply options', async () => {
        const allowedMentions = { parse: [] };
        const files = [{ attachment: Buffer.from('x'), name: 'a.txt' }];
        await senderFor(mock).send({ components: reply.components, allowedMentions, files });
        expect(mock.reply).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions, files }));
    });

    it('omits allowedMentions and files from the reply options when unset', async () => {
        await senderFor(mock).send(reply);
        const sent = mock.reply.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(sent).not.toHaveProperty('allowedMentions');
        expect(sent).not.toHaveProperty('files');
    });

    it('forwards allowedMentions and files into the edit body', async () => {
        const allowedMentions = { parse: [] };
        const files = [{ attachment: Buffer.from('x'), name: 'a.txt' }];
        const editMessage = vi.fn().mockResolvedValue(sentMessage);
        const editMock = { ...mock, webhook: { editMessage } };
        await senderFor(editMock).edit(sentMessage as never, { components: reply.components, allowedMentions, files });
        expect(editMessage).toHaveBeenCalledWith(
            sentMessage,
            expect.objectContaining({ allowedMentions, files, flags: MessageFlags.IsComponentsV2 })
        );
    });
});
