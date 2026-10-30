import type { KvDriver } from './Kv';

// a bot typed with a narrower driver has to pass one, because the MemoryDriver fallback is only a KvDriver
export type NarrowedKv<TDriver extends KvDriver> = KvDriver extends TDriver ? unknown : { kv: TDriver };
