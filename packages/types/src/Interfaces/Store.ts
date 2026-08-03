import type { IRateLimiter } from './RateLimiter';
import type { EpochMs } from '../Types/Epoch';

/** A verb group a store backend implements. */
export type Capability = 'charge' | 'claim' | 'cas' | 'timer';

/** The backend a store adapter runs on. */
export type StoreKind = 'memory' | 'sqlite' | 'd1' | 'turso' | 'durable-object' | 'redis';

interface StoreBase<Caps extends Capability> {
    readonly kind: StoreKind;
    readonly caps: ReadonlySet<Caps>;
}

interface ClaimOps {
    claim(key: string, ttlMs: number): Promise<boolean>;
}

interface CasOps {
    get(key: string): Promise<{ value: string | null; version: number }>;
    // compare-and-swap, the write applies only while the version still matches the read
    cas(key: string, version: number, value: string | null): Promise<boolean>;
}

interface TimerOps {
    timer(key: string, fireAt: EpochMs): Promise<void>;
}

/**
 * A store typed by its capability set. A verb outside the declared set is a compile error.
 *
 * @typeParam Caps - The capability set the store implements.
 */
export type Store<Caps extends Capability = never> = StoreBase<Caps> &
    ('charge' extends Caps ? IRateLimiter : unknown) &
    ('claim' extends Caps ? ClaimOps : unknown) &
    ('cas' extends Caps ? CasOps : unknown) &
    ('timer' extends Caps ? TimerOps : unknown);
