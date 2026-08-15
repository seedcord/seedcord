import { TextDisplayBuilder } from '@discordjs/builders';
import { AckTrace } from '@seedcord/core/internal';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { MessageFlags } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { message, mockInteraction, senderFor } from './utils/senderMock';

import type { SentMessage } from '#bot/ReplySender';
import type { ReplyResponse } from '@seedcord/types';

const V2 = MessageFlags.IsComponentsV2;
const V2_EPHEMERAL = V2 | MessageFlags.Ephemeral;

const reply: ReplyResponse = { components: [new TextDisplayBuilder().setContent('hi')] };
const serialized = reply.components.map((c) => c.toJSON());

interface SentReplyOptions {
    components?: unknown[];
    flags?: number;
    withResponse?: boolean;
    allowedMentions?: unknown;
    files?: unknown[];
}

function replyOptions(mock: ReturnType<typeof mockInteraction>): SentReplyOptions {
    return (mock.reply.mock.calls[0]?.[0] as SentReplyOptions | undefined) ?? {};
}

describe('ReplySender state seeding', () => {
    it('seeds unacked from an unacked interaction, so reply is legal', async () => {
        const mock = mockInteraction();
        await senderFor(mock).reply(reply);
        expect(mock.reply).toHaveBeenCalledOnce();
    });

    it('seeds replied when the interaction was already replied to, so reply throws', async () => {
        const mock = mockInteraction({ replied: true });
        await expect(senderFor(mock).reply(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.reply).not.toHaveBeenCalled();
    });

    it('seeds deferred-reply from a deferReply, so a bare edit fills @original', async () => {
        const mock = mockInteraction({ deferred: true, ephemeral: false });
        await senderFor(mock).edit(reply);
        expect(mock.editReply).toHaveBeenCalledOnce();
    });

    it('seeds deferred-update from a deferUpdate (ephemeral null), so send follows up', async () => {
        const mock = mockInteraction({ deferred: true, ephemeral: null });
        await senderFor(mock).send(reply);
        expect(mock.followUp).toHaveBeenCalledOnce();
        expect(mock.editReply).not.toHaveBeenCalled();
    });
});

describe('ReplySender.reply', () => {
    it('replies with withResponse and the v2 ephemeral flag', async () => {
        const mock = mockInteraction();
        await senderFor(mock).reply(reply);
        const options = replyOptions(mock);
        expect(options.withResponse).toBe(true);
        expect(options.components).toEqual(serialized);
        expect(options.flags).toBe(V2_EPHEMERAL);
    });

    it('returns the created message off the callback resource', async () => {
        const mock = mockInteraction();
        await expect(senderFor(mock).reply(reply)).resolves.toBe(message);
    });

    it('drops the ephemeral flag when ephemeral is false, keeping v2', async () => {
        const mock = mockInteraction();
        await senderFor(mock).reply(reply, { ephemeral: false });
        expect(replyOptions(mock).flags).toBe(V2);
    });

    it('sets SuppressNotifications on a silent reply', async () => {
        const mock = mockInteraction();
        await senderFor(mock).reply(reply, { silent: true });
        const flags = replyOptions(mock).flags ?? 0;
        expect(flags & MessageFlags.SuppressNotifications).toBe(MessageFlags.SuppressNotifications);
    });

    it('wraps a string into a TextDisplay component', async () => {
        const mock = mockInteraction();
        await senderFor(mock).reply('done');
        expect(replyOptions(mock).components).toEqual([new TextDisplayBuilder().setContent('done').toJSON()]);
    });

    it('throws ReplyCallbackMissingMessage when the callback carries no message', async () => {
        const mock = mockInteraction();
        mock.reply.mockResolvedValueOnce({ resource: { message: null } });
        await expect(senderFor(mock).reply(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyCallbackMissingMessage)
        );
    });

    it('advances to replied when the callback acked but carried no message, so a followUp works', async () => {
        const mock = mockInteraction();
        mock.reply.mockResolvedValueOnce({ resource: { message: null } });
        const sender = senderFor(mock);
        await sender.reply(reply).catch(() => undefined);

        await sender.followUp(reply);

        expect(mock.followUp).toHaveBeenCalledOnce();
    });

    it('throws ReplyIllegalAckState before any djs call on a second reply', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.reply(reply);

        await expect(sender.reply(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.reply).toHaveBeenCalledOnce();
    });

    it('carries the first ack as the cause on a double reply', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.reply(reply);

        const caught = await sender.reply(reply).then(
            () => null,
            (error: unknown) => error
        );
        if (!isSeedcordError(caught)) throw caught;
        expect(caught.cause).toBeInstanceOf(AckTrace);
        expect((caught.cause as AckTrace).message).toContain('reply() acknowledged this interaction');
    });
});

describe('ReplySender.defer', () => {
    it('deferReplies with the ephemeral flag by default', async () => {
        const mock = mockInteraction();
        await senderFor(mock).defer();
        expect(mock.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    });

    it('drops the ephemeral flag on defer({ ephemeral: false })', async () => {
        const mock = mockInteraction();
        await senderFor(mock).defer({ ephemeral: false });
        expect(mock.deferReply).toHaveBeenCalledWith({ flags: 0 });
    });

    it('advances to deferred-reply so a follow-up edit fills @original', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();
        await sender.edit(reply);
        expect(mock.editReply).toHaveBeenCalledOnce();
    });

    it('throws before any djs call when deferring an already-replied interaction', async () => {
        const mock = mockInteraction({ replied: true });
        await expect(senderFor(mock).defer()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.deferReply).not.toHaveBeenCalled();
    });

    it('carries the defer as the cause when a reply follows a defer', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();

        const caught = await sender.reply(reply).then(
            () => null,
            (error: unknown) => error
        );
        if (!isSeedcordError(caught)) throw caught;
        expect(caught.cause).toBeInstanceOf(AckTrace);
        expect((caught.cause as AckTrace).message).toContain('defer() acknowledged this interaction');
    });
});

describe('ReplySender.deferUpdate', () => {
    it('calls deferUpdate on a component interaction', async () => {
        const mock = mockInteraction();
        await senderFor(mock).deferUpdate();
        expect(mock.deferUpdate).toHaveBeenCalledOnce();
    });

    it('advances to deferred-update so update edits @original', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.deferUpdate();
        await sender.update(reply);
        expect(mock.editReply).toHaveBeenCalledOnce();
        expect(mock.update).not.toHaveBeenCalled();
    });

    it('throws before any djs call when defer-updating a replied interaction', async () => {
        const mock = mockInteraction({ replied: true });
        await expect(senderFor(mock).deferUpdate()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.deferUpdate).not.toHaveBeenCalled();
    });
});

describe('ReplySender.update', () => {
    it('updates with withResponse and the v2 flag on a fresh component', async () => {
        const mock = mockInteraction();
        await senderFor(mock).update(reply);
        const options = mock.update.mock.calls[0]?.[0] as {
            components?: unknown[];
            flags?: number;
            withResponse?: boolean;
        };
        expect(options.withResponse).toBe(true);
        expect(options.components).toEqual(serialized);
        expect(options.flags).toBe(V2);
    });

    it('returns the updated message off the callback resource', async () => {
        const mock = mockInteraction();
        await expect(senderFor(mock).update(reply)).resolves.toBe(message);
    });

    it('edits @original in the deferred-update state, leaving state deferred-update and not remembering', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.deferUpdate();

        const source = await sender.update(reply);

        expect(mock.editReply).toHaveBeenCalledOnce();
        expect(mock.update).not.toHaveBeenCalled();
        // the source message is not minted, so a later targeted edit of it throws foreign
        await expect(sender.edit(source, reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
    });

    it('permits repeated update after a deferred update, each editing @original', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.deferUpdate();
        await sender.update(reply);
        await sender.update(reply);
        expect(mock.editReply).toHaveBeenCalledTimes(2);
    });

    it('throws before any djs call when updating a replied interaction', async () => {
        const mock = mockInteraction({ replied: true });
        await expect(senderFor(mock).update(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.update).not.toHaveBeenCalled();
        expect(mock.editReply).not.toHaveBeenCalled();
    });

    it('throws ReplyUpdateWithoutSource before any djs call on a command interaction', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: false });
        await expect(senderFor(mock).update(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyUpdateWithoutSource)
        );
        expect(mock.update).not.toHaveBeenCalled();
    });

    it('throws ReplyUpdateWithoutSource on a modal opened from a command', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: true, isFromMessage: false });
        await expect(senderFor(mock).update(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyUpdateWithoutSource)
        );
    });

    it('permits update on a modal opened from a message', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: true, isFromMessage: true });
        await senderFor(mock).update(reply);
        expect(mock.update).toHaveBeenCalledOnce();
    });
});

describe('ReplySender.deferUpdate source guards', () => {
    it('throws ReplyUpdateWithoutSource before any djs call on a command interaction', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: false });
        await expect(senderFor(mock).deferUpdate()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyUpdateWithoutSource)
        );
        expect(mock.deferUpdate).not.toHaveBeenCalled();
    });
});

describe('ReplySender.followUp', () => {
    it('reaches the webhook after a deferUpdate', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.deferUpdate();

        await sender.followUp(reply);

        expect(mock.followUp).toHaveBeenCalledOnce();
    });

    it('reaches the webhook after a defer', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();

        await sender.followUp(reply);

        expect(mock.followUp).toHaveBeenCalledOnce();
    });

    it('follows up with the v2 ephemeral flag once acked', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.reply(reply);

        await sender.followUp(reply);

        const options = mock.followUp.mock.calls[0]?.[0] as { components?: unknown[]; flags?: number };
        expect(options.components).toEqual(serialized);
        expect(options.flags).toBe(V2_EPHEMERAL);
    });

    it('returns the followUp message directly', async () => {
        const mock = mockInteraction({ replied: true });
        await expect(senderFor(mock).followUp(reply)).resolves.toBe(message);
    });

    it('throws before any djs call when following up an unacked interaction', async () => {
        const mock = mockInteraction();
        await expect(senderFor(mock).followUp(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.followUp).not.toHaveBeenCalled();
    });
});

describe('ReplySender.edit (bare)', () => {
    it('edits @original with the v2 flag', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.reply(reply);

        await sender.edit(reply);

        const options = mock.editReply.mock.calls[0]?.[0] as { components?: unknown[]; flags?: number };
        expect(options.components).toEqual(serialized);
        expect(options.flags).toBe(V2);
    });

    it('remembers the bare edit target so a later targeted edit of it succeeds', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();
        mock.editReply.mockResolvedValueOnce({ id: 'orig-1' });
        const original = await sender.edit(reply);

        await sender.edit(original, reply);

        expect(mock.webhook.editMessage).toHaveBeenCalledWith('orig-1', expect.anything());
    });

    it('does not remember the bare edit in the deferred-update state', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.deferUpdate();
        mock.editReply.mockResolvedValueOnce({ id: 'orig-8' });
        const source = await sender.edit(reply);

        await expect(sender.edit(source, reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
    });

    it('throws before any djs call when editing an unacked interaction', async () => {
        const mock = mockInteraction();
        await expect(senderFor(mock).edit(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.editReply).not.toHaveBeenCalled();
    });
});

describe('ReplySender.edit (targeted)', () => {
    it('edits the target message id through the webhook', async () => {
        const mock = mockInteraction({ replied: true });
        const sender = senderFor(mock);
        mock.followUp.mockResolvedValueOnce({ id: 'earlier-99' });
        const prompt = await sender.followUp('confirm?');

        await sender.edit(prompt, 'cancelled');

        expect(mock.webhook.editMessage).toHaveBeenCalledWith('earlier-99', expect.anything());
        const options = mock.webhook.editMessage.mock.calls[0]?.[1] as { components?: unknown[] };
        expect(options.components).toEqual([new TextDisplayBuilder().setContent('cancelled').toJSON()]);
    });

    it('throws ReplyForeignEditTarget before any djs call for a message the interaction did not send', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.reply(reply);
        const foreign = { id: 'foreign-1' } as SentMessage;

        await expect(sender.edit(foreign, 'x')).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
        expect(mock.webhook.editMessage).not.toHaveBeenCalled();
    });
});

describe('ReplySender.delete', () => {
    it('deletes @original on the bare form', async () => {
        const mock = mockInteraction({ replied: true });
        await senderFor(mock).delete();
        expect(mock.deleteReply).toHaveBeenCalledWith();
    });

    it('deletes @original with a bare call after a deferred reply', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();
        await sender.delete();
        expect(mock.deleteReply).toHaveBeenCalledWith();
    });

    it('deletes @original with a bare call after a deferred update', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.deferUpdate();
        await sender.delete();
        expect(mock.deleteReply).toHaveBeenCalledWith();
    });

    it('deletes the target message id on the targeted form', async () => {
        const mock = mockInteraction({ replied: true });
        const sender = senderFor(mock);
        mock.followUp.mockResolvedValueOnce({ id: 'earlier-42' });
        const prompt = await sender.followUp('confirm?');

        await sender.delete(prompt);

        expect(mock.deleteReply).toHaveBeenCalledWith('earlier-42');
    });

    it('evicts the target so a later targeted edit of it throws foreign', async () => {
        const mock = mockInteraction({ replied: true });
        const sender = senderFor(mock);
        mock.followUp.mockResolvedValueOnce({ id: 'earlier-7' });
        const prompt = await sender.followUp('confirm?');

        await sender.delete(prompt);

        await expect(sender.edit(prompt, 'x')).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
    });

    it('throws ReplyForeignEditTarget before any djs call for a message the interaction did not send', async () => {
        const mock = mockInteraction({ replied: true });
        const sender = senderFor(mock);
        const foreign = { id: 'foreign-1' } as SentMessage;

        await expect(sender.delete(foreign)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
        expect(mock.deleteReply).not.toHaveBeenCalled();
    });

    it('throws before any djs call when deleting an unacked interaction', async () => {
        const mock = mockInteraction();
        await expect(senderFor(mock).delete()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(mock.deleteReply).not.toHaveBeenCalled();
    });
});

describe('ReplySender.send', () => {
    it('replies on an unacked interaction', async () => {
        const mock = mockInteraction();
        await senderFor(mock).send(reply);
        expect(mock.reply).toHaveBeenCalledOnce();
    });

    it('edits @original after a deferReply', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();
        await sender.send(reply);
        expect(mock.editReply).toHaveBeenCalledOnce();
    });

    it('overwrites @original on a second send after a deferred reply', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();

        await sender.send(reply);
        await sender.send(reply);

        expect(mock.editReply).toHaveBeenCalledTimes(2);
        expect(mock.followUp).not.toHaveBeenCalled();
    });

    it('follows up after a deferUpdate, leaving the source message untouched', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.deferUpdate();
        await sender.send(reply);
        expect(mock.followUp).toHaveBeenCalledOnce();
        expect(mock.editReply).not.toHaveBeenCalled();
    });

    it('follows up after a reply', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.reply(reply);
        await sender.send(reply);
        expect(mock.followUp).toHaveBeenCalledOnce();
    });

    it('applies send opts only when it creates a message', async () => {
        const mock = mockInteraction();
        await senderFor(mock).send(reply, { ephemeral: false });
        expect(replyOptions(mock).flags).toBe(V2);
    });

    it('drops send opts when the deferred-reply arm edits @original', async () => {
        const mock = mockInteraction();
        const sender = senderFor(mock);
        await sender.defer();

        await sender.send(reply, { ephemeral: false });

        const body = mock.editReply.mock.calls[0]?.[0] as { flags?: number };
        expect(body.flags).toBe(V2);
    });
});

describe('ReplySender files and mentions', () => {
    it('forwards allowedMentions and files into the reply options', async () => {
        const mock = mockInteraction();
        const allowedMentions = { parse: [] as ('roles' | 'users' | 'everyone')[] };
        const files = [{ attachment: Buffer.from('x'), name: 'a.txt' }];

        await senderFor(mock).reply({ components: reply.components, allowedMentions, files });

        const options = replyOptions(mock);
        expect(options.allowedMentions).toEqual(allowedMentions);
        expect(options.files).toEqual(files);
    });

    it('omits allowedMentions and files from the reply options when unset', async () => {
        const mock = mockInteraction();
        await senderFor(mock).reply(reply);
        const options = replyOptions(mock);
        expect(options).not.toHaveProperty('allowedMentions');
        expect(options).not.toHaveProperty('files');
    });

    it('forwards allowedMentions and files into the targeted edit body', async () => {
        const mock = mockInteraction({ replied: true });
        const sender = senderFor(mock);
        mock.followUp.mockResolvedValueOnce({ id: 'earlier-1' });
        const target = await sender.followUp('confirm?');
        const allowedMentions = { parse: [] as ('roles' | 'users' | 'everyone')[] };
        const files = [{ attachment: Buffer.from('x'), name: 'a.txt' }];

        await sender.edit(target, { components: reply.components, allowedMentions, files });

        const options = mock.webhook.editMessage.mock.calls[0]?.[1] as {
            allowedMentions?: unknown;
            files?: unknown[];
            flags?: number;
        };
        expect(options.allowedMentions).toEqual(allowedMentions);
        expect(options.files).toEqual(files);
        expect(options.flags).toBe(V2);
    });
});
