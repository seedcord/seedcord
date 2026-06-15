import { DatabaseError } from '@seedcord/kit/internal';
import { describe, it, expect } from 'vitest';

import { throwDatabaseError } from '../src/shared/throwDatabaseError';

describe('throwDatabaseError', () => {
    it('throws a DatabaseError carrying the original error message', () => {
        let thrown: unknown;
        try {
            throwDatabaseError(new Error('connection refused'), 'fallback');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(DatabaseError);
        expect((thrown as DatabaseError).message).toBe('connection refused');
    });

    it('uses the fallback message when the value is not an Error', () => {
        let thrown: unknown;
        try {
            throwDatabaseError('not-an-error', 'fallback message');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(DatabaseError);
        expect((thrown as DatabaseError).message).toBe('fallback message');
    });
});
