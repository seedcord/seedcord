import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { finalizePluginContext, Plugin } from '@src/plugin/Plugin';

import type { CoreBase } from '@interfaces/CoreBase';
import type { Config, Store } from '@seedcord/types';
import type { PluginContext } from '@src/plugin/Plugin';

class Db extends Plugin<{ needs: 'token' | 'rest' }> {
    // justified: never invoked, ctx wiring is all these tests read
    public init(): Promise<void> {
        return Promise.resolve();
    }
    public reachCtx(): PluginContext<'token' | 'rest'> {
        return this.ctx;
    }
    public reject(reason: string): never {
        return this.rejectOptions(reason);
    }
}

// justified: the base ctor only stores the host
const host = { config: {}, rateLimiter: {} } as unknown as CoreBase;

// justified: field stubs, the tests only check identity and the token arm
function makeCtx(): PluginContext<'token' | 'rest'> {
    return {
        config: {} as Config,
        store: {} as Store<'charge'>,
        token: 'secret',
        rest: {},
        client: undefined as never
    };
}

describe('plugin ctx', () => {
    it('throws when ctx is read before finalization', () => {
        const db = new Db(host);
        try {
            db.reachCtx();
            expect.fail('expected a throw');
        } catch (err) {
            expect(isSeedcordError(err, undefined, SeedcordErrorCode.PluginContextBeforeInit)).toBe(true);
        }
    });

    it('returns the installed values after finalization', () => {
        const db = new Db(host);
        const ctx = makeCtx();
        finalizePluginContext(db, ctx);
        expect(db.reachCtx()).toBe(ctx);
        expect(db.reachCtx().token).toBe('secret');
    });

    it('rejectOptions throws with the class name and reason', () => {
        const db = new Db(host);
        try {
            db.reject('uri is required');
            expect.fail('expected a throw');
        } catch (err) {
            expect(isSeedcordError(err, undefined, SeedcordErrorCode.PluginOptionsRejected)).toBe(true);
            expect((err as Error).message).toContain('Db');
            expect((err as Error).message).toContain('uri is required');
        }
    });

    it('renders a single period when the reason already ends with one', () => {
        const db = new Db(host);
        try {
            db.reject('uri is required.');
            expect.fail('expected a throw');
        } catch (err) {
            expect((err as Error).message).toMatch(/uri is required\.$/);
            expect((err as Error).message).not.toMatch(/\.\.$/);
        }
    });
});
