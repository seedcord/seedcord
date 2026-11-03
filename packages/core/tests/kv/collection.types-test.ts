import { Kv } from '#src/kv/Kv';
import { MemoryDriver } from '#src/kv/MemoryDriver';

interface AsInterface {
    name: string;
    at: Date;
    tags: string[];
    note?: string;
    nested: { id: number; flags: readonly boolean[] };
}
const kv = new Kv(new MemoryDriver());

kv.collection<AsInterface>('a');
kv.collection<string>('c');
kv.collection<number[]>('d');
kv.collection<{ id: string } | null>('e');
// @ts-expect-error a function has no JSON form
kv.collection<() => void>('f');
// @ts-expect-error a Map serializes to {}
kv.collection<Map<string, string>>('g');
// @ts-expect-error a function nested in a record
kv.collection<{ name: string; run: () => void }>('h');
// @ts-expect-error JSON.stringify throws on a bigint
kv.collection<{ n: bigint }>('i');
// @ts-expect-error the record type is missing
kv.collection('j');
