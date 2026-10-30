import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import Keyv from 'keyv';
import { createStorage } from 'unstorage';
import fsDriver from 'unstorage/drivers/fs';
import { createStorage as createStorageV1 } from 'unstorage-v1';
import fsDriverV1 from 'unstorage-v1/drivers/fs';
import { afterAll, afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { KeyvDriver } from '#src/kv/KeyvDriver';
import { Kv } from '#src/kv/Kv';
import { MemoryDriver } from '#src/kv/MemoryDriver';
import { UnstorageDriver } from '#src/kv/UnstorageDriver';

import type { Config } from '@seedcord/types';

interface Job {
    task: string;
    runAt: Date;
    data: { userId: string; tags: string[] };
}

interface Case {
    name: string;
    // a second call opens the same backing data, the way a restarted bot would
    open: () => NonNullable<Config['kv']>;
    persists: boolean;
}

const fsRoot = mkdtempSync(path.join(tmpdir(), 'seedcord-kv-'));
const fsBase = path.join(fsRoot, 'fs');
const fsBaseV1 = path.join(fsRoot, 'fs-v1');
afterAll(() => rmSync(fsRoot, { recursive: true, force: true }));

const memory = new MemoryDriver();
const keyvMemory = new KeyvDriver(new Keyv());
const unstorageMemory = new UnstorageDriver(createStorage());
const unstorageV1Memory = new UnstorageDriver(createStorageV1());

const cases: Case[] = [
    { name: 'MemoryDriver', open: () => memory, persists: false },
    { name: 'Keyv over a Map', open: () => keyvMemory, persists: false },
    { name: 'unstorage memory', open: () => unstorageMemory, persists: false },
    {
        name: 'unstorage fs',
        open: () => new UnstorageDriver(createStorage({ driver: fsDriver({ base: fsBase }) })),
        persists: true
    },
    { name: 'unstorage 1.x memory', open: () => unstorageV1Memory, persists: false },
    {
        name: 'unstorage 1.x fs',
        open: () => new UnstorageDriver(createStorageV1({ driver: fsDriverV1({ base: fsBaseV1 }) })),
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

    it('lists only its own records', async () => {
        const driver = open();
        await new Kv(driver, 'a').collection<number>('job').set('1', 1);
        await new Kv(driver, 'a').collection<number>('jobs').set('2', 2);
        await new Kv(driver, 'a').collection<number>('job:settings').set('3', 3);
        await new Kv(driver, 'b').collection<number>('job').set('4', 4);

        const entries = await Array.fromAsync(new Kv(driver, 'a').collection<number>('job').entries());
        expect(entries).toEqual([['1', 1]]);
    });

    it('keeps every id as written', async () => {
        const ids = [
            'a:b',
            'a::b',
            'a%3Ab',
            'x/y',
            String.raw`x\y`,
            'q',
            'q?z',
            '..',
            '.',
            '',
            'end$',
            ':lead',
            'trail:'
        ];
        const names = new Kv(open()).collection<string>('id');
        await Promise.all(ids.map(async (id) => names.set(id, `value of ${id}`)));

        expect(await Promise.all(ids.map(async (id) => names.get(id)))).toEqual(ids.map((id) => `value of ${id}`));
        const listed = await Array.fromAsync(names.entries());
        expect(listed.map(([id]) => id).toSorted()).toEqual(ids.toSorted());
    });

    it('returns a stored string exactly as written', async () => {
        const driver = open();
        await driver.set('raw', 'plain text');
        expect(await driver.get('raw')).toBe('plain text');
    });

    it('deletes', async () => {
        const flags = new Kv(open()).collection<boolean>('flag');
        await flags.set('x', true);
        await flags.delete('x');
        expect(await flags.get('x')).toBeUndefined();
    });

    it('runs concurrent updates on one key one after another', async () => {
        const counts = new Kv(open()).collection<number>('count');
        const bump = async (): Promise<number> => counts.update('runs', (n) => (n ?? 0) + 1);

        const results = await Promise.all([bump(), bump(), bump(), bump(), bump()]);
        expect(results.toSorted()).toEqual([1, 2, 3, 4, 5]);
        expect(await counts.get('runs')).toBe(5);
    });

    it('keeps a delete that lands while an update runs', async () => {
        const counts = new Kv(open()).collection<number>('race');
        await counts.set('k', 5);

        await Promise.all([counts.update('k', (n) => (n ?? 0) + 1), counts.delete('k')]);
        expect(await counts.get('k')).toBeUndefined();
    });

    it.runIf(persists)('reads what an earlier instance wrote', async () => {
        await new Kv(open()).collection<string>('restart').set('k', 'kept');
        expect(await new Kv(open()).collection<string>('restart').get('k')).toBe('kept');
    });

    describe('with a ttl', () => {
        beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
        afterEach(() => vi.useRealTimers());

        it('expires the key once the ttl passes, and deletes it on the next read', async () => {
            const driver = open();
            const kv = new Kv(driver).collection<string>('ttl');
            await kv.set('read', 'v', 1000);
            await kv.set('listed', 'v', 1000);
            expect(await kv.get('read')).toBe('v');

            vi.setSystemTime(Date.now() + 1000);
            expect(await kv.get('read')).toBeUndefined();
            expect(await Array.fromAsync(kv.entries())).toEqual([]);
            expect(await Array.fromAsync(driver.entries('ttl:'))).toEqual([]);
        });

        it('keeps a set that lands while a read deletes the expired record', async () => {
            const kv = new Kv(open()).collection<string>('ttl-race');
            await kv.set('k', 'old', 1000);
            vi.setSystemTime(Date.now() + 1000);

            await Promise.all([kv.get('k'), kv.set('k', 'new')]);
            expect(await kv.get('k')).toBe('new');
        });

        it('takes a ttl computed from the stored value', async () => {
            const kv = new Kv(open()).collection<number>('ttl-fn');
            await kv.update(
                'k',
                () => 5,
                (seconds) => seconds * 1000
            );

            vi.setSystemTime(Date.now() + 4999);
            expect(await kv.get('k')).toBe(5);
            vi.setSystemTime(Date.now() + 1);
            expect(await kv.get('k')).toBeUndefined();
        });
    });
});

describe('KeyvDriver', () => {
    it('throws on entries() when the Keyv store cannot list its keys', async () => {
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

        await expect(Array.fromAsync(jobs.entries())).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreKvKeysUnsupported
        });
    });

    it('throws when Keyv reports a failed write', async () => {
        const down = (): Promise<never> => Promise.reject(new Error('store down'));
        const keyv = new Keyv({ store: { get: down, set: down, delete: down, clear: down } });
        // once an 'error' listener exists, Keyv resolves a failed set() to false
        keyv.on('error', () => undefined);
        const jobs = new Kv(new KeyvDriver(keyv)).collection<number>('job');

        await expect(jobs.set('1', 1)).rejects.toMatchObject({ code: SeedcordErrorCode.CoreKvDriverFailed });
    });
});

describe('a driver that throws', () => {
    it('surfaces as CoreKvDriverFailed, with what it threw as the cause', async () => {
        const down = new Error('store down');
        class DownDriver extends MemoryDriver {
            public override get(): never {
                throw down;
            }
        }
        const counts = new Kv(new DownDriver()).collection<number>('count');

        await expect(counts.update('k', (n) => (n ?? 0) + 1)).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreKvDriverFailed,
            cause: down
        });
    });
});

describe('UnstorageDriver', () => {
    it('passes Cloudflare KV a ttl of at least 60 seconds', async () => {
        const ttls: (number | undefined)[] = [];
        const storage = {
            getItemRaw: () => Promise.resolve(null),
            setItemRaw: (_key: string, _value: string, opts?: { ttl?: number }) => {
                ttls.push(opts?.ttl);
                return Promise.resolve();
            },
            removeItem: () => Promise.resolve(),
            getKeys: () => Promise.resolve([]),
            dispose: () => Promise.resolve()
        };
        const driver = new UnstorageDriver(storage);

        await driver.set('short', 'v', 30_000);
        await driver.set('long', 'v', 90_500);
        await driver.set('forever', 'v');

        expect(ttls).toEqual([60, 91, undefined]);
    });
});
