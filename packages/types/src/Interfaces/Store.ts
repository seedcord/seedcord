import type { IRateLimiter } from './RateLimiter';
import type { EpochMs } from '../Types/Epoch';

export type Capability = 'charge' | 'claim' | 'cas' | 'timer';

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
    cas(key: string, version: number, value: string | null): Promise<boolean>;
}

interface TimerOps {
    timer(key: string, fireAt: EpochMs): Promise<void>;
}

// each cap adds its verbs, so timer on a Store<'charge'> is a compile error for example
export type Store<Caps extends Capability = never> = StoreBase<Caps> &
    ('charge' extends Caps ? IRateLimiter : unknown) &
    ('claim' extends Caps ? ClaimOps : unknown) &
    ('cas' extends Caps ? CasOps : unknown) &
    ('timer' extends Caps ? TimerOps : unknown);
