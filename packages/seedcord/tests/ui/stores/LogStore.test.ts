import { afterEach, describe, expect, it } from 'vitest';

import { LogStore } from '@ui/stores/LogStore';

import type { LogRecord } from '@seedcord/logger';

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

    it('caps the widest-label width for the right-aligned column', async () => {
        store.onLog(record({ label: 'Bot', message: 'a' }));
        store.onLog(record({ label: 'CoordinatedShutdown', message: 'b' }));
        await store.flush();

        expect(store.getLabelWidth()).toBe(12);
    });
});
