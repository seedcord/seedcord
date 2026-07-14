/* eslint-disable max-lines -- one suite per sender, splitting fragments the shared rest mock and body fixtures */
import { TextDisplayBuilder } from '@discordjs/builders';
import { AckTrace } from '@seedcord/core/internal';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { MessageFlags } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { ReplySender } from '@reply/ReplySender';

import type { REST } from '@discordjs/rest';
import type { InteractionRef, SentMessage } from '@reply/ReplySender';
import type { ReplyResponse } from '@seedcord/types';

const APP_ID = '111';
const INTERACTION_ID = '222';
const TOKEN = 'tok';
const ROUTE = 'slash:ban';

const CALLBACK_ROUTE = `/interactions/${INTERACTION_ID}/${TOKEN}/callback`;
const WEBHOOK_ROUTE = `/webhooks/${APP_ID}/${TOKEN}`;
const ORIGINAL_ROUTE = `/webhooks/${APP_ID}/${TOKEN}/messages/@original`;

const V2 = MessageFlags.IsComponentsV2;
const V2_EPHEMERAL = V2 | MessageFlags.Ephemeral;

const message = { id: 'msg-1' };
const withResponse = { resource: { message } };

interface RestMock {
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
}

function restMock(): RestMock {
    return {
        post: vi.fn().mockResolvedValue(withResponse),
        patch: vi.fn().mockResolvedValue(message),
        delete: vi.fn().mockResolvedValue(undefined)
    };
}

const ref: InteractionRef = { application_id: APP_ID, id: INTERACTION_ID, token: TOKEN };

// justified: the fixture implements only the REST surface ReplySender reads.
function senderFor(rest: RestMock): ReplySender {
    return new ReplySender(ref, rest as unknown as REST, ROUTE);
}

const reply: ReplyResponse = { components: [new TextDisplayBuilder().setContent('hi')] };
const serialized = reply.components.map((c) => c.toJSON());

interface CallbackBody {
    type: number;
    data?: {
        flags?: number;
        components?: unknown[];
        allowed_mentions?: unknown;
        attachments?: unknown[];
        title?: string;
        custom_id?: string;
    };
}
interface PostOptions {
    body: CallbackBody;
    query?: URLSearchParams;
    files?: { name: string; data: Buffer }[];
}
interface WebhookOptions {
    body: { flags?: number; components?: unknown[]; allowed_mentions?: unknown };
    files?: { name: string; data: Buffer }[];
}

function postCall(rest: RestMock, index = 0): { route: string; options: PostOptions } {
    const [route, options] = rest.post.mock.calls[index] as [string, PostOptions];
    return { route, options };
}

function patchCall(rest: RestMock, index = 0): { route: string; options: WebhookOptions } {
    const [route, options] = rest.patch.mock.calls[index] as [string, WebhookOptions];
    return { route, options };
}

function deleteRoute(rest: RestMock, index = 0): string {
    return (rest.delete.mock.calls[index] as [string])[0];
}

describe('ReplySender.reply', () => {
    it('POSTs a callback type 4 with with_response and the v2 ephemeral flag', async () => {
        const rest = restMock();

        await senderFor(rest).reply(reply);

        expect(rest.post).toHaveBeenCalledTimes(1);
        const { route, options } = postCall(rest);
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.query?.get('with_response')).toBe('true');
        expect(options.body).toEqual({
            type: 4,
            data: { components: serialized, flags: V2_EPHEMERAL }
        });
    });

    it('returns the created message off the callback resource', async () => {
        const rest = restMock();

        await expect(senderFor(rest).reply(reply)).resolves.toBe(message);
    });

    it('throws ReplyCallbackMissingMessage when the callback carries no message', async () => {
        const rest = restMock();
        rest.post.mockResolvedValueOnce({ resource: null });

        await expect(senderFor(rest).reply(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyCallbackMissingMessage)
        );
    });

    it('drops the ephemeral flag when ephemeral is false, keeping v2', async () => {
        const rest = restMock();

        await senderFor(rest).reply(reply, { ephemeral: false });

        expect(postCall(rest).options.body.data?.flags).toBe(V2);
    });

    it('sets SuppressNotifications on a silent reply', async () => {
        const rest = restMock();

        await senderFor(rest).reply(reply, { silent: true });

        const flags = postCall(rest).options.body.data?.flags ?? 0;
        expect(flags & MessageFlags.SuppressNotifications).toBe(MessageFlags.SuppressNotifications);
    });

    it('wraps a string into a TextDisplay component', async () => {
        const rest = restMock();

        await senderFor(rest).reply('done');

        expect(postCall(rest).options.body.data?.components).toEqual([
            new TextDisplayBuilder().setContent('done').toJSON()
        ]);
    });

    it('throws ReplyIllegalAckState before any API call on a second reply', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);

        try {
            await sender.reply(reply);
            expect.unreachable('the second reply should throw');
        } catch (error) {
            expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)).toBe(true);
        }
        expect(rest.post).toHaveBeenCalledTimes(1);
    });

    it('carries the first ack as the cause on a double reply', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
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
    it('POSTs a callback type 5 with the ephemeral flag and no with_response', async () => {
        const rest = restMock();

        await senderFor(rest).defer();

        const { route, options } = postCall(rest);
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.query).toBeUndefined();
        expect(options.body).toEqual({ type: 5, data: { flags: MessageFlags.Ephemeral } });
    });

    it('drops the ephemeral flag on defer({ ephemeral: false })', async () => {
        const rest = restMock();

        await senderFor(rest).defer({ ephemeral: false });

        expect(postCall(rest).options.body.data?.flags).toBe(0);
    });

    it('advances to deferred-reply so a follow-up edit fills @original', async () => {
        const rest = restMock();
        const sender = senderFor(rest);

        await sender.defer();
        await sender.edit(reply);

        expect(rest.patch).toHaveBeenCalledWith(ORIGINAL_ROUTE, expect.anything());
    });

    it('throws before any API call when deferring an already-replied interaction', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);

        await expect(sender.defer()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(rest.post).toHaveBeenCalledTimes(1);
    });
});

describe('ReplySender.deferUpdate', () => {
    it('POSTs a callback type 6 with no data and no with_response', async () => {
        const rest = restMock();

        await senderFor(rest).deferUpdate();

        const { route, options } = postCall(rest);
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.query).toBeUndefined();
        expect(options.body).toEqual({ type: 6 });
    });

    it('throws before any API call when defer-updating a replied interaction', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);

        await expect(sender.deferUpdate()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(rest.post).toHaveBeenCalledTimes(1);
    });

    it('advances to deferred-update so update PATCHes @original', async () => {
        const rest = restMock();
        const sender = senderFor(rest);

        await sender.deferUpdate();
        await sender.update(reply);

        expect(patchCall(rest).route).toBe(ORIGINAL_ROUTE);
        expect(patchCall(rest).options.body.components).toEqual(serialized);
        expect(rest.post).toHaveBeenCalledTimes(1);
    });
});

describe('ReplySender.update', () => {
    it('POSTs a callback type 7 with with_response and the v2 flag on a fresh component', async () => {
        const rest = restMock();

        await senderFor(rest).update(reply);

        const { route, options } = postCall(rest);
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.query?.get('with_response')).toBe('true');
        expect(options.body).toEqual({ type: 7, data: { components: serialized, flags: V2 } });
    });

    it('returns the updated message off the callback resource', async () => {
        const rest = restMock();

        await expect(senderFor(rest).update(reply)).resolves.toBe(message);
    });

    it('throws before any API call when updating a replied interaction', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);

        await expect(sender.update(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(rest.post).toHaveBeenCalledTimes(1);
    });

    it('permits followUp after update fills a deferred update', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.deferUpdate();
        await sender.update(reply);
        rest.post.mockClear();
        rest.post.mockResolvedValue(message);

        await sender.followUp(reply);

        expect(postCall(rest).route).toBe(WEBHOOK_ROUTE);
    });

    it('permits repeated update after a deferred update, each PATCHing @original', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.deferUpdate();

        await sender.update(reply);
        await sender.update(reply);

        expect(patchCall(rest, 0).route).toBe(ORIGINAL_ROUTE);
        expect(patchCall(rest, 1).route).toBe(ORIGINAL_ROUTE);
    });
});

describe('ReplySender.followUp', () => {
    it('POSTs the webhook route with the v2 ephemeral flag once acked', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        rest.post.mockClear();

        await sender.followUp(reply);

        const { route, options } = postCall(rest);
        expect(route).toBe(WEBHOOK_ROUTE);
        expect(options.body).toEqual({ components: serialized, flags: V2_EPHEMERAL });
    });

    it('sends wait=true so the created message returns in the body', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        rest.post.mockClear();

        await sender.followUp(reply);

        expect(postCall(rest).options.query?.get('wait')).toBe('true');
    });

    it('posts the webhook route after a defer', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.defer();
        rest.post.mockClear();
        rest.post.mockResolvedValue(message);

        await sender.followUp(reply);

        expect(postCall(rest).route).toBe(WEBHOOK_ROUTE);
    });

    it('posts the webhook route after a deferUpdate without a PATCH', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.deferUpdate();
        rest.post.mockClear();
        rest.post.mockResolvedValue(message);

        await sender.followUp(reply);

        expect(postCall(rest).route).toBe(WEBHOOK_ROUTE);
        expect(rest.patch).not.toHaveBeenCalled();
    });

    it('returns the webhook message directly, not off a resource', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        rest.post.mockResolvedValueOnce(message);

        await expect(sender.followUp(reply)).resolves.toBe(message);
    });

    it('throws before any API call when following up an unacked interaction', async () => {
        const rest = restMock();

        await expect(senderFor(rest).followUp(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(rest.post).not.toHaveBeenCalled();
    });
});

describe('ReplySender.edit', () => {
    it('PATCHes @original with the v2 flag on the bare form', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);

        await sender.edit(reply);

        const { route, options } = patchCall(rest);
        expect(route).toBe(ORIGINAL_ROUTE);
        expect(options.body).toEqual({ components: serialized, flags: V2 });
    });

    it('PATCHes the target message id on the targeted form', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        rest.post.mockResolvedValueOnce({ id: 'earlier-99' });
        const prompt = await sender.followUp('confirm?');

        await sender.edit(prompt, 'cancelled');

        expect(patchCall(rest).route).toBe(`${WEBHOOK_ROUTE}/messages/earlier-99`);
        expect(patchCall(rest).options.body.components).toEqual([
            new TextDisplayBuilder().setContent('cancelled').toJSON()
        ]);
    });

    it('throws ReplyForeignEditTarget before any API call for a message the interaction did not send', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        // justified: only the id is read from the target
        const foreign = { id: 'foreign-1' } as SentMessage;

        await expect(sender.edit(foreign, 'x')).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
        expect(rest.patch).not.toHaveBeenCalled();
    });

    it('throws ReplyForeignEditTarget for the source message a deferred update rewrote', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.deferUpdate();
        rest.patch.mockResolvedValueOnce({ id: 'orig-7' });
        const filled = await sender.update(reply);

        await expect(sender.edit(filled, 'again')).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
        expect(rest.patch).toHaveBeenCalledTimes(1);
    });

    it('rejects the source message a bare edit returned after a deferred update', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.deferUpdate();
        rest.patch.mockResolvedValueOnce({ id: 'orig-8' });
        const source = await sender.edit('filled');

        await expect(sender.edit(source, 'x')).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
        expect(rest.patch).toHaveBeenCalledTimes(1);
    });

    it('accepts the message a bare edit returned as a later target', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.defer();
        rest.patch.mockResolvedValueOnce({ id: 'orig-1' });
        const original = await sender.edit('filled');

        await sender.edit(original, 'refilled');

        expect(patchCall(rest, 1).route).toBe(`${WEBHOOK_ROUTE}/messages/orig-1`);
    });

    it('throws before any API call when editing an unacked interaction', async () => {
        const rest = restMock();

        await expect(senderFor(rest).edit(reply)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(rest.patch).not.toHaveBeenCalled();
    });
});

describe('ReplySender.delete', () => {
    it('DELETEs @original on the bare form', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);

        await sender.delete();

        expect(deleteRoute(rest)).toBe(ORIGINAL_ROUTE);
    });

    it('DELETEs @original with a bare call after a deferred update', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.deferUpdate();

        await sender.delete();

        expect(deleteRoute(rest)).toBe(ORIGINAL_ROUTE);
    });

    it('DELETEs the target message id on the targeted form', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        rest.post.mockResolvedValueOnce({ id: 'earlier-42' });
        const prompt = await sender.followUp('confirm?');

        await sender.delete(prompt);

        expect(deleteRoute(rest)).toBe(`${WEBHOOK_ROUTE}/messages/earlier-42`);
    });

    it('evicts the target so a later targeted edit of it throws foreign', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        rest.post.mockResolvedValueOnce({ id: 'earlier-7' });
        const prompt = await sender.followUp('confirm?');

        await sender.delete(prompt);

        await expect(sender.edit(prompt, 'x')).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
    });

    it('throws ReplyForeignEditTarget before any API call for a message the interaction did not send', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        // justified: only the id is read from the target
        const foreign = { id: 'foreign-1' } as SentMessage;

        await expect(sender.delete(foreign)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
        expect(rest.delete).not.toHaveBeenCalled();
    });

    it('throws before any API call when deleting an unacked interaction', async () => {
        const rest = restMock();

        await expect(senderFor(rest).delete()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(rest.delete).not.toHaveBeenCalled();
    });
});

describe('ReplySender.send', () => {
    it('replies on an unacked interaction', async () => {
        const rest = restMock();

        await senderFor(rest).send(reply);

        expect(postCall(rest).options.body.type).toBe(4);
    });

    it('edits @original after a deferReply', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.defer();

        await sender.send(reply);

        expect(rest.patch).toHaveBeenCalledWith(ORIGINAL_ROUTE, expect.anything());
    });

    it('follows up after a deferUpdate, leaving the source message untouched', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.deferUpdate();
        rest.post.mockClear();
        rest.post.mockResolvedValue(message);

        await sender.send(reply);

        expect(rest.post).toHaveBeenCalledWith(WEBHOOK_ROUTE, expect.anything());
        expect(rest.patch).not.toHaveBeenCalled();
    });

    it('follows up after a reply', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply(reply);
        rest.post.mockClear();
        rest.post.mockResolvedValue(message);

        await sender.send(reply);

        expect(rest.post).toHaveBeenCalledWith(WEBHOOK_ROUTE, expect.anything());
    });

    it('applies send opts only when it creates a message', async () => {
        const rest = restMock();

        await senderFor(rest).send(reply, { ephemeral: false });

        expect(postCall(rest).options.body.data?.flags).toBe(V2);
    });

    it('overwrites @original on a second send after a deferred reply', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.defer();

        await sender.send(reply);
        await sender.send(reply);

        expect(patchCall(rest, 0).route).toBe(ORIGINAL_ROUTE);
        expect(patchCall(rest, 1).route).toBe(ORIGINAL_ROUTE);
    });

    it('drops send opts when the deferred-reply arm edits', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.defer();

        await sender.send(reply, { ephemeral: false });

        expect(patchCall(rest).route).toBe(ORIGINAL_ROUTE);
        expect(patchCall(rest).options.body.flags).toBe(V2);
    });
});

describe('ReplySender.showModal', () => {
    it('POSTs a callback type 9 with the modal data and no with_response', async () => {
        const rest = restMock();
        const modal = { toJSON: () => ({ title: 'Feedback', custom_id: 'fb', components: [] }) };

        await senderFor(rest).showModal(modal);

        const { route, options } = postCall(rest);
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.query).toBeUndefined();
        expect(options.body).toEqual({ type: 9, data: { title: 'Feedback', custom_id: 'fb', components: [] } });
    });

    it('translates a modal toJSON throw before any API call', async () => {
        const rest = restMock();
        class FeedbackModal {
            toJSON(): never {
                throw new RangeError('Modal title must be 1-45 characters.');
            }
        }

        try {
            await senderFor(rest).showModal(new FeedbackModal());
            expect.unreachable('showModal should throw');
        } catch (error) {
            expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ReplyComponentSerialization)).toBe(true);
            if (!isSeedcordError(error)) throw error;
            expect(error.message).toContain('FeedbackModal');
            expect(error.message).toContain('Modal title must be 1-45 characters');
            expect(error.cause).toBeInstanceOf(RangeError);
        }
        expect(rest.post).not.toHaveBeenCalled();
    });

    it('labels a null-prototype modal without crashing', async () => {
        const rest = restMock();
        const modal = Object.create(null) as { toJSON(): never };
        modal.toJSON = () => {
            throw new RangeError('bad modal');
        };

        try {
            await senderFor(rest).showModal(modal);
            expect.unreachable('showModal should throw');
        } catch (error) {
            expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ReplyComponentSerialization)).toBe(true);
            if (!isSeedcordError(error)) throw error;
            expect(error.message).toContain('modal');
        }
        expect(rest.post).not.toHaveBeenCalled();
    });

    it('advances to replied so a later showModal throws', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        const modal = { toJSON: () => ({ title: 'x', custom_id: 'y', components: [] }) };
        await sender.showModal(modal);

        await expect(sender.showModal(modal)).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyIllegalAckState)
        );
        expect(rest.post).toHaveBeenCalledTimes(1);
    });
});

describe('ReplySender files', () => {
    it('forwards files to the REST files option and allowed_mentions into the body', async () => {
        const rest = restMock();
        const files = [{ attachment: Buffer.from('x'), name: 'a.txt' }];
        const allowedMentions = { parse: [] as ('roles' | 'users' | 'everyone')[] };

        await senderFor(rest).reply({ components: reply.components, allowedMentions, files });

        const { options } = postCall(rest);
        expect(options.files).toEqual([{ name: 'a.txt', data: files[0]?.attachment }]);
        expect(options.body.data?.allowed_mentions).toEqual(allowedMentions);
    });

    it('maps repliedUser to the wire key replied_user', async () => {
        const rest = restMock();

        await senderFor(rest).reply({
            components: reply.components,
            allowedMentions: { parse: ['users'], repliedUser: false }
        });

        expect(postCall(rest).options.body.data?.allowed_mentions).toEqual({ parse: ['users'], replied_user: false });
    });

    it('omits the attachments key when files carry no description', async () => {
        const rest = restMock();
        const files = [{ attachment: Buffer.from('x'), name: 'a.txt' }];

        await senderFor(rest).reply({ components: reply.components, files });

        expect(postCall(rest).options.body.data?.attachments).toBeUndefined();
    });

    it('keeps attachment ids aligned when only some files carry descriptions', async () => {
        const rest = restMock();
        const files = [
            { attachment: Buffer.from('a'), name: 'plain.txt' },
            { attachment: Buffer.from('b'), name: 'described.txt', description: 'alt text' }
        ];

        await senderFor(rest).reply({ components: reply.components, files });

        expect(postCall(rest).options.body.data?.attachments).toEqual([
            { id: 0, filename: 'plain.txt' },
            { id: 1, filename: 'described.txt', description: 'alt text' }
        ]);
    });

    it('carries file descriptions into the attachments body entries', async () => {
        const rest = restMock();
        const files = [{ attachment: Buffer.from('x'), name: 'report.txt', description: 'quarterly totals' }];

        await senderFor(rest).reply({ components: reply.components, files });

        expect(postCall(rest).options.body.data?.attachments).toEqual([
            { id: 0, filename: 'report.txt', description: 'quarterly totals' }
        ]);
        expect(postCall(rest).options.files).toEqual([{ name: 'report.txt', data: files[0]?.attachment }]);
    });
});
