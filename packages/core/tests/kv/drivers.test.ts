import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import Keyv from 'keyv';
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { KeyvDriver } from '#src/kv/KeyvDriver';
import { Kv } from '#src/kv/Kv';
import { MemoryDriver } from '#src/kv/MemoryDriver';
import { UnstorageDriver } from '#src/kv/UnstorageDriver';

import type { KvDriver } from '@seedcord/types';

interface Job {
    task: string;
    runAt: Date;
    data: { userId: string; tags: string[] };
}

interface Case {
    name: string;
    // a second call opens the same backing data, the way a restarted bot would
    open: () => KvDriver;
    persists: boolean;
}

const fsBase = path.join(mkdtempSync(path.join(tmpdir(), 'seedcord-kv-')), 'fs');

const memory = new MemoryDriver();
const keyvMemory = new KeyvDriver(new Keyv());
const unstorageMemory = new UnstorageDriver(createStorage());

const cases: Case[] = [
    { name: 'MemoryDriver', open: () => memory, persists: false },
    { name: 'Keyv over a Map', open: () => keyvMemory, persists: false },
    { name: 'unstorage memory', open: () => unstorageMemory, persists: false },
    {
        name: 'unstorage fs',
        open: () => new UnstorageDriver(createStorage({ driver: fsDriver({ base: fsBase }) })),
        persists: true
    }
];

const job: Job = { task: 'Reminder', runAt: new Date(0), data: { userId: '1', tags: ['a', 'b'] } };

describe.each(cases)('$name', ({ open, persists }) => {
    it('round-trips a record through JSON', async () => {
        const jobs = new Kv(open(), 'plugins', 'tasks').collection<Job>('job');
        await jobs.set('abc', job);

        const read = await jobs.get('abc');
        expectTypeOf(read).toEqualTypeOf<
            { task: string; runAt: string; data: { userId: string; tags: string[] } } | undefined
        >();
        expect(read).toEqual({ ...job, runAt: '1970-01-01T00:00:00.000Z' });
    });

    it('lists only its own ids', async () => {
        const driver = open();
        await new Kv(driver, 'a').collection<number>('job').set('1', 1);
        await new Kv(driver, 'a').collection<number>('jobs').set('2', 2);
        await new Kv(driver, 'b').collection<number>('job').set('3', 3);

        expect(await new Kv(driver, 'a').collection<number>('job').ids()).toEqual(['1']);
    });

    it('deletes', async () => {
        const flags = new Kv(open()).collection<boolean>('flag');
        await flags.set('x', true);
        await flags.delete('x');
        expect(await flags.get('x')).toBeUndefined();
    });

    it('runs concurrent updates on one key one after another', async () => {
        const counts = new Kv(open()).collection<number>('count');
        const bump = async (): Promise<number> =>
            counts.update('runs', (n) => ({ value: (n ?? 0) + 1, result: (n ?? 0) + 1 }));

        const results = await Promise.all([bump(), bump(), bump(), bump(), bump()]);
        expect(results.toSorted()).toEqual([1, 2, 3, 4, 5]);
        expect(await counts.get('runs')).toBe(5);
    });

    it.runIf(persists)('reads what an earlier instance wrote', async () => {
        await new Kv(open()).collection<string>('restart').set('k', 'kept');
        expect(await new Kv(open()).collection<string>('restart').get('k')).toBe('kept');
    });

    describe('with a ttl', () => {
        beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
        afterEach(() => vi.useRealTimers());

        it('expires the key once the ttl passes', async () => {
            const kv = new Kv(open()).collection<string>('ttl');
            await kv.set('k', 'v', 1000);
            expect(await kv.get('k')).toBe('v');

            vi.setSystemTime(Date.now() + 1000);
            expect(await kv.get('k')).toBeUndefined();
            expect(await kv.ids()).toEqual([]);
        });
    });
});

describe('KeyvDriver', () => {
    it('throws on ids() when the Keyv store cannot list its keys', async () => {
        const store = new Map<string, unknown>();
        // memcache can't list its keys either
        const unlistable = {
            get: (key: string) => Promise.resolve(store.get(key)),
            set: (key: string, value: unknown) => Promise.resolve(store.set(key, value)),
            delete: (key: string) => Promise.resolve(store.delete(key)),
            clear: () => Promise.resolve(store.clear())
        };
        const jobs = new Kv(new KeyvDriver(new Keyv({ store: unlistable }))).collection<number>('job');
        await jobs.set('1', 1);

        await expect(jobs.ids()).rejects.toMatchObject({ code: SeedcordErrorCode.CoreKvKeysUnsupported });
    });
});

describe('UnstorageDriver', () => {
    it('passes Cloudflare KV a ttl of at least 60 seconds', async () => {
        const ttls: (number | undefined)[] = [];
        const storage = {
            getItem: () => Promise.resolve(null),
            setItem: (_key: string, _value: string, opts?: { ttl?: number }) => {
                ttls.push(opts?.ttl);
                return Promise.resolve();
            },
            removeItem: () => Promise.resolve(),
            getKeys: () => Promise.resolve([])
        };
        const driver = new UnstorageDriver(storage);

        await driver.set('short', 'v', 30_000);
        await driver.set('long', 'v', 90_500);
        await driver.set('forever', 'v');

        expect(ttls).toEqual([60, 91, undefined]);
    });
});
