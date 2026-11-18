import { captureLogs } from '@seedcord/logger/internal';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { created, TestSender } from './helpers';

import type { TestMessage } from './helpers';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('reply timing', () => {
    it('puts the line on the interactions channel at trace', async () => {
        using logs = captureLogs();

        await new TestSender().defer();

        expect(logs.records.find((record) => record.label === 'Reply')).toMatchObject({
            channel: 'interactions',
            level: 'trace'
        });
    });

    it('traces the route, the verb, the outcome, and the elapsed write', async () => {
        using logs = captureLogs();
        const sender = new TestSender();
        let clock = 1000;
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        vi.spyOn(sender as unknown as { writeReply: () => Promise<TestMessage> }, 'writeReply').mockImplementation(
            () => {
                clock += 88;
                return Promise.resolve(created);
            }
        );

        await sender.reply('hi');

        const traces = logs.at('trace');
        expect(traces).toHaveLength(1);
        const [message] = traces;
        expect(message).toContain('slash:ping');
        expect(message).toContain('reply');
        expect(message).toContain('sent');
        expect(message).toContain('88ms');
    });

    it('traces a failed write with its outcome', async () => {
        using logs = captureLogs();
        const sender = new TestSender();
        vi.spyOn(sender as unknown as { writeDefer: () => Promise<void> }, 'writeDefer').mockRejectedValue(
            new Error('discord said no')
        );

        await expect(sender.defer()).rejects.toThrow('discord said no');

        const [message] = logs.at('trace');
        expect(message).toContain('defer');
        expect(message).toContain('failed');
    });
});
