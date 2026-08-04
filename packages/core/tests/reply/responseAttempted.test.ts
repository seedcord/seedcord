import { describe, expect, it, vi } from 'vitest';

import { BaseReplySender } from '@reply/BaseReplySender';
import { Bus } from '@subscribers/Bus';

import type { CoreBase } from '@interfaces/CoreBase';
import type { ModalLike } from '@reply/BaseReplySender';
import type { ReplyResponse } from '@seedcord/types';
import type { SubscriptionData } from '@subscribers/types/Subscriptions';

interface TestMessage {
    id: string;
}

const created: TestMessage = { id: 'm1' };

class TestSender extends BaseReplySender<TestMessage> {
    public constructor(bus?: Bus) {
        super('slash:ping', 'unacked', bus && { bus, interactionId: 'i1' });
    }

    protected writeReply(): Promise<TestMessage> {
        return Promise.resolve(created);
    }
    protected writeDefer(): Promise<void> {
        return Promise.resolve();
    }
    protected writeDeferUpdate(): Promise<void> {
        return Promise.resolve();
    }
    protected writeUpdate(): Promise<TestMessage> {
        return Promise.resolve(created);
    }
    protected writeFollowUp(): Promise<TestMessage> {
        return Promise.resolve(created);
    }
    protected writeEditOriginal(): Promise<TestMessage> {
        return Promise.resolve(created);
    }
    protected writeEditTarget(): Promise<TestMessage> {
        return Promise.resolve(created);
    }
    protected writeDeleteOriginal(): Promise<void> {
        return Promise.resolve();
    }
    protected writeDeleteTarget(): Promise<void> {
        return Promise.resolve();
    }
    protected writeModal(): Promise<void> {
        return Promise.resolve();
    }
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

    it('reports a null message id for the acks that carry none', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);

        await sender.defer();
        await sender.delete();

        expect(sent.map((payload) => [payload.method, payload.messageId])).toEqual([
            ['defer', null],
            ['delete', null]
        ]);
    });

    it('reports showModal, which acks without a message', async () => {
        const { bus, sent } = busWithSpy();
        await new TestSender(bus).showModal({ toJSON: () => ({}) } as unknown as ModalLike);

        expect(sent[0]).toMatchObject({ method: 'showModal', messageId: null });
    });

    it('reports the routed verb for send, never send itself', async () => {
        const { bus, sent } = busWithSpy();
        await new TestSender(bus).send(response);

        expect(sent.map((payload) => payload.method)).toEqual(['reply']);
    });

    // the write advances the clock, so no other performance.now() reader shifts the measurement
    it('measures the write, from before it starts until it settles', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        let clock = 500;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        vi.spyOn(sender as unknown as { writeReply: () => Promise<TestMessage> }, 'writeReply').mockImplementation(
            () => {
                clock += 250;
                return Promise.resolve(created);
            }
        );

        await sender.reply(response);

        expect(sent[0]?.durationMs).toBe(250);
        vi.restoreAllMocks();
    });

    it('wraps a non-Error rejection, so the failed write still reports', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        vi.spyOn(sender as unknown as { writeReply: () => Promise<TestMessage> }, 'writeReply').mockRejectedValue(
            'discord said no'
        );

        // the caller still sees the value that was thrown
        await expect(sender.reply(response)).rejects.toBe('discord said no');

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ method: 'reply', outcome: 'failed', messageId: null });
        expect(sent[0]?.error?.message).toBe('discord said no');
    });

    it('keeps the thrown value as the cause', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        const thrown = { code: 500 };
        vi.spyOn(sender as unknown as { writeReply: () => Promise<TestMessage> }, 'writeReply').mockRejectedValue(
            thrown
        );

        await expect(sender.reply(response)).rejects.toBe(thrown);

        expect(sent[0]?.error?.cause).toBe(thrown);
    });

    it('reports a failed write, carrying the error and no message id', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        vi.spyOn(sender as unknown as { writeReply: () => Promise<TestMessage> }, 'writeReply').mockRejectedValue(
            new Error('discord said no')
        );

        await expect(sender.reply(response)).rejects.toThrow('discord said no');

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ method: 'reply', outcome: 'failed', messageId: null });
        expect(sent[0]?.error?.message).toBe('discord said no');
    });

    it('stays silent with no bus, the getConfirmation path', async () => {
        const sender = new TestSender();
        await expect(sender.reply(response)).resolves.toBe(created);
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
