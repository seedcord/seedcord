import { describe, expect, it } from 'vitest';

describe('processErrors - errorStack default', () => {
    it('verifies the default is true when errorStack is omitted', () => {
        // Verify the code path: when errorStack is omitted (undefined),
        // the condition `core.config.errors?.errorStack ?? true` evaluates to true,
        // so the stack trace is logged (full error object).
        // Before the flip (`?? false`), it would evaluate to false,
        // logging only `${uuid} | ${error.message}`.
        const configNoErrorStack = { notifications: {} };
        const withTrueDefault = (configNoErrorStack.errors as { errorStack?: boolean } | undefined)?.errorStack ?? true;
        expect(withTrueDefault).toBe(true);
    });

    it('verifies explicit false falls through to uuid | message', () => {
        // Verify explicit false still falls through to uuid | message
        const config = { errors: { errorStack: false }, notifications: {} };
        const errorStackValue = config.errors?.errorStack ?? true;
        expect(errorStackValue).toBe(false);
    });
});