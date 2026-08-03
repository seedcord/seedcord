import { describe, it, expect, expectTypeOf } from 'vitest';

import { defineGate } from '@gates/Gate';
import { Notice } from '@stops/Notice';

import { TestNotice } from '../utils/TestNotice';

import type { Gate, GateContextBase } from '@gates/Gate';

// gates ignore ctx here, so a minimal cast stands in
const ctx = {} as unknown as GateContextBase;

describe('defineGate', () => {
    it('returns a named gate whose check runs', async () => {
        let ran = false;
        const Gate = defineGate('marker', () => {
            ran = true;
        });

        await Gate.check(ctx);

        expect(Gate.name).toBe('marker');
        expect(ran).toBe(true);
    });

    it('surfaces a refusal thrown from a sync check as a rejected promise', async () => {
        const Gate = defineGate('refuser', () => {
            throw new TestNotice('nope');
        });

        await expect(Gate.check(ctx)).rejects.toBeInstanceOf(Notice);
    });

    it('brands the result so a bare check function is not a Gate', () => {
        const bare = (_ctx: GateContextBase): void => {};
        // @ts-expect-error a bare check function lacks the Gate brand
        const notAGate: Gate = bare;

        expect(notAGate).toBe(bare);
    });

    it('requires only the scalar base when the check reads no ctx', () => {
        const AgnosticGate = defineGate('any', () => {});
        expectTypeOf(AgnosticGate).toEqualTypeOf<Gate<GateContextBase, 'any'>>();
    });

    it('infers a narrowed required context from the ctx annotation', () => {
        interface GuildCtx extends GateContextBase {
            readonly guildId: string;
        }
        const GuildGate = defineGate('guild', (ctx: GuildCtx) => {
            void ctx.guildId;
        });

        expectTypeOf(GuildGate).toEqualTypeOf<Gate<GuildCtx, 'guild'>>();
    });
});
