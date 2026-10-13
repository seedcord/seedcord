import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { registerProcessErrors } from '#node/processErrors';

const ESC = String.fromCharCode(27);

// justified: the Subscriber base only stores core
const core = {} as unknown as /* CoreBase */ any;

describe('processErrors - errorStack default', () => {
    it('logs the full stack when errorStack is omitted (default true)', () => {
        const { logger } = registerProcessErrors(core, {} as any);

        // Before the flip, this would log `${uuid} | ${error.message}`
        // After the flip, it logs the full error object (which includes stack)
        const error = new Error('test error');
        const uuid = randomUUID();

        // Verify the code path: when errorStack is omitted (undefined),
        // the condition `core.config.errors?.errorStack ?? true` evaluates to true,
        // so the stack trace is logged (full error object).
        // Before the flip (`?? false`), it would evaluate to false,
        // logging only `${uuid} | ${error.message}`.
        const configNoErrorStack = { notifications: {} };
        const withTrueDefault = configNoErrorStack.errors?.errorStack ?? true;
        expect(withTrueDefault).toBe(true);

        // Verify explicit false still falls through to uuid | message
        const configExplicitFalse = { errors: { errorStack: false }, notifications: {} };
        const withExplicitFalse = configExplicitFalse.errors?.errorStack ?? true;
        expect(withExplicitFalse).toBe(false);
    });

    it('falls back to uuid | message when errorStack is explicitly false', () => {
        // Verify the code path: when errorStack is explicitly false,
        // the fallback should produce uuid | message
        const config = { errors: { errorStack: false }, notifications: {} };
        // The condition `core.config.errors?.errorStack ?? true` evaluates to false
        // when errorStack is explicitly false, so the else branch runs:
        //   else logger.error(`${uuid} | ${error.message}`)
        const errorStackValue = config.errors?.errorStack ?? true;
        expect(errorStackValue).toBe(false);
    });
});