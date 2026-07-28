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
        super('slash:ping', 'unacked', bus);
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
function busWithSpy(): { bus: Bus; sent: SubscriptionData<'responseSent'>[] } {
    const bus = new Bus({} as unknown as CoreBase);
    const sent: SubscriptionData<'responseSent'>[] = [];
    bus.on('responseSent', (payload) => sent.push(payload));
    return { bus, sent };
}

const response: ReplyResponse = { components: [] };

describe('responseSent', () => {
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

    it('publishes nothing when the write throws', async () => {
        const { bus, sent } = busWithSpy();
        const sender = new TestSender(bus);
        vi.spyOn(sender as unknown as { writeReply: () => Promise<TestMessage> }, 'writeReply').mockRejectedValue(
            new Error('discord said no')
        );

        await expect(sender.reply(response)).rejects.toThrow();
        expect(sent).toHaveLength(0);
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
