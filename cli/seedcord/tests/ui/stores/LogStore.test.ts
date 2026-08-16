import { afterEach, describe, expect, it } from 'vitest';

import { LogStore } from '#ui/stores/LogStore';

import type { LogRecord } from '@seedcord/types';

function record(overrides: Partial<LogRecord>): LogRecord {
    return { level: 'info', message: '', label: 'Bot', channel: 'default', timestamp: 1_700_000_000_000, ...overrides };
}

describe('LogStore', () => {
    const store = LogStore.instance;
    afterEach(() => store.clear());

    it('carries level, label, channel, head, and the record timestamp onto each entry', async () => {
        store.onLog(record({ level: 'warn', label: 'Mongoose', channel: 'db', message: 'up', timestamp: 42 }));
        await store.flush();

        const [entry] = store.getLogs();
        expect(entry).toMatchObject({ level: 'warn', label: 'Mongoose', channel: 'db', head: true, timestamp: 42 });
    });

    it('marks the first line head and the rest continuation for a multi-line record', async () => {
        store.onLog(record({ level: 'error', message: 'boom', args: [new Error('bad')] }));
        await store.flush();

        const heads = store.getLogs().map((e) => e.head);
        expect(heads.length).toBeGreaterThan(1);
        expect(heads[0]).toBe(true);
        expect(heads.slice(1).every((h) => !h)).toBe(true);
    });

    it('marks the stack frames of an error, leaving its message unmarked', async () => {
        store.onLog(record({ level: 'error', message: 'boom', args: [new Error('the message')] }));
        await store.flush();

        const logs = store.getLogs();
        const message = logs.find((entry) => entry.text.includes('the message'));
        const frames = logs.filter((entry) => entry.text.includes(' at '));

        expect(message?.frame).toBe(false);
        expect(frames.length).toBeGreaterThan(0);
        expect(frames.every((entry) => entry.frame)).toBe(true);
    });

    it('leaves a block continuation unmarked', async () => {
        store.onLog(record({ message: 'Loaded handlers\nFeedNav' }));
        await store.flush();

        expect(store.getLogs().every((entry) => !entry.frame)).toBe(true);
    });

    it('caps the widest-label width for the right-aligned column', async () => {
        store.onLog(record({ label: 'Bot', message: 'a' }));
        store.onLog(record({ label: 'CoordinatedShutdown', message: 'b' }));
        await store.flush();

        expect(store.getLabelWidth()).toBe(12);
    });
});
