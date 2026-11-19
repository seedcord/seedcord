import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vite-plus/test';

import { Bus } from '#subscribers/Bus';

import { TestSender } from './helpers';

import type { CoreBase } from '#interfaces/CoreBase';
import type { ResponseFailed, SubscriptionData } from '#subscribers/types/Subscriptions';
import type { ReplyResponse } from '@seedcord/types';

function failedWrite(payload: SubscriptionData<'responseAttempted'> | undefined): ResponseFailed {
    if (payload?.outcome !== 'failed') throw new Error(`expected a failed write, got ${String(payload?.outcome)}`);
    return payload;
}

// justified: the Bus only stores core, no member is read during publish
function busWithSpy(): { bus: Bus; sent: SubscriptionData<'responseAttempted'>[] } {
    const bus = new Bus({} as unknown as CoreBase);
    const sent: SubscriptionData<'responseAttempted'>[] = [];
    bus.on('responseAttempted', (payload) => sent.push(payload));
    return { bus, sent };
}

const response: ReplyResponse = { components: [] };

describe('responseAttempted', () => {
    it('reports the created message id for a reply', async () => {
        const { bus, sent } = busWithSpy();
        await new TestSender(bus).reply(response);

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ routeId: 'slash:ping', method: 'reply', messageId: 'm1' });
    });

    it("reports a null message id and body for the acks that don't send a message", async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);

        await sender.defer();
        await sender.delete();

        expect(sent.map((payload) => [payload.method, payload.messageId, payload.body])).toEqual([
            ['defer', null, null],
            ['delete', null, null]
        ]);
    });

    it('reports showModal with the modal it opened', async () => {
        const { bus, sent } = busWithSpy();
        const modal = { custom_id: 'feedback', title: 'Feedback', components: [] };
        await new TestSender(bus).showModal({ toJSON: () => modal });

        expect(sent[0]).toMatchObject({ method: 'showModal', messageId: null, body: modal });
    });

    it('reports the components and mentions a reply sent', async () => {
        const { bus, sent } = busWithSpy();
        const text = { type: ComponentType.TextDisplay, content: 'hi <@1>' } as const;

        await new TestSender(bus).reply({ components: [text], allowedMentions: { users: ['1'] } });

        expect(sent[0]?.body).toEqual({ components: [text], allowedMentions: { users: ['1'] } });
    });

    it('reports file names and descriptions without their bytes', async () => {
        const { bus, sent } = busWithSpy();

        await new TestSender(bus).reply({
            components: [],
            files: [
                { data: new Uint8Array([1, 2, 3]), name: 'chart.png', description: 'Sales by month', title: 'Sales' }
            ]
        });

        expect(sent[0]?.body).toEqual({
            components: [],
            files: [{ name: 'chart.png', description: 'Sales by month', title: 'Sales' }]
        });
    });

    it('reports the body a failed edit tried to send, next to the error', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        const text = { type: ComponentType.TextDisplay, content: 'edited' } as const;
        await sender.reply(response);
        sender.beforeWrite = () => Promise.reject(new Error('Invalid Form Body'));

        await expect(sender.edit({ components: [text] })).rejects.toThrow('Invalid Form Body');

        expect(sent[1]).toMatchObject({ method: 'edit', outcome: 'failed', body: { components: [text] } });
    });

    it('reports a failed write with a null body when a file entry is broken', async () => {
        const { bus, sent } = busWithSpy();
        // justified: plain JavaScript can pass null here
        const files = [null] as unknown as NonNullable<ReplyResponse['files']>;

        await expect(new TestSender(bus).reply({ components: [], files })).rejects.toThrow();

        expect(sent.map((payload) => [payload.method, payload.outcome, payload.body])).toEqual([
            ['reply', 'failed', null]
        ]);
    });

    it('reports a failed write with a null body when a builder fails to serialize', async () => {
        const { bus, sent } = busWithSpy();
        const broken = {
            toJSON: () => {
                throw new Error('missing content');
            }
        };

        await expect(new TestSender(bus).reply({ components: [broken] })).rejects.toThrow();
        await expect(new TestSender(bus).showModal(broken)).rejects.toThrow();

        expect(sent.map((payload) => [payload.method, payload.outcome, payload.body])).toEqual([
            ['reply', 'failed', null],
            ['showModal', 'failed', null]
        ]);
    });

    it('reports the routed verb for send, never send itself', async () => {
        const { bus, sent } = busWithSpy();
        await new TestSender(bus).send(response);

        expect(sent.map((payload) => payload.method)).toEqual(['reply']);
    });

    // no other performance.now() reader shifts the measurement because the write advances the clock
    it('measures the write, from before it starts until it settles', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        let clock = 500;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        sender.beforeWrite = () => {
            clock += 250;
            return Promise.resolve();
        };

        await sender.reply(response);

        expect(sent[0]?.durationMs).toBe(250);
        vi.restoreAllMocks();
    });

    it('wraps a non-Error rejection, so the failed write still reports', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        sender.beforeWrite = vi.fn<() => Promise<void>>().mockRejectedValue('discord said no');

        // the caller still receives the value that was thrown
        await expect(sender.reply(response)).rejects.toBe('discord said no');

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ method: 'reply', outcome: 'failed', messageId: null });
        expect(failedWrite(sent[0]).error.message).toBe('discord said no');
    });

    it('keeps the thrown value as the cause', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        const thrown = { code: 500 };
        sender.beforeWrite = vi.fn<() => Promise<void>>().mockRejectedValue(thrown);

        await expect(sender.reply(response)).rejects.toBe(thrown);

        expect(failedWrite(sent[0]).error.cause).toBe(thrown);
    });

    it('reports a failed write, carrying the error and no message id', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        sender.beforeWrite = () => Promise.reject(new Error('discord said no'));

        await expect(sender.reply(response)).rejects.toThrow('discord said no');

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ method: 'reply', outcome: 'failed', messageId: null });
        expect(failedWrite(sent[0]).error.message).toBe('discord said no');
    });

    it('reports deferUpdate and the update that rewrites through it', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);

        await sender.deferUpdate();
        await sender.update(response);

        expect(sent.map((payload) => [payload.method, payload.messageId])).toEqual([
            ['deferUpdate', null],
            ['update', 'm1']
        ]);
    });

    it('reports a fresh update, the branch that writes its own message', async () => {
        const { bus, sent } = busWithSpy();
        await new TestSender(bus).update(response);

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ method: 'update', messageId: 'm1' });
    });

    it('reports followUp and an edit of the original', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);

        await sender.reply(response);
        await sender.followUp(response);
        await sender.edit(response);

        expect(sent.map((payload) => payload.method)).toEqual(['reply', 'followUp', 'edit']);
    });

    it('reports an edit and a delete aimed at a remembered message', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);

        const message = await sender.reply(response);
        await sender.edit(message, response);
        await sender.delete(message);

        expect(sent.map((payload) => [payload.method, payload.messageId])).toEqual([
            ['reply', 'm1'],
            ['edit', 'm1'],
            ['delete', null]
        ]);
    });
});
