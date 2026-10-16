import { assert, describe, expect, it } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '#src/index';
import { SeedcordError, throwSingleOrAggregate } from '#src/internal.index';

const problem = (folder: string): SeedcordError =>
    new SeedcordError(SeedcordErrorCode.CorePathOutsideRoot, [folder, '/bot/src']);

describe('throwSingleOrAggregate', () => {
    it('returns when there are no problems', () => {
        expect(() => throwSingleOrAggregate([], SeedcordErrorCode.CliProblems)).not.toThrow();
    });

    it('throws a single problem as itself', () => {
        const only = problem('./handlers');

        expect(() => throwSingleOrAggregate([only], SeedcordErrorCode.CliProblems)).toThrow(only);
    });

    it('throws two or more problems as one aggregate carrying the count', () => {
        const problems = [problem('./handlers'), problem('./commands')];

        let thrown: unknown;
        try {
            throwSingleOrAggregate(problems, SeedcordErrorCode.CliProblems);
        } catch (error: unknown) {
            thrown = error;
        }

        assert(isSeedcordError(thrown, 'SeedcordAggregateError', SeedcordErrorCode.CliProblems));
        expect(thrown.errors).toEqual(problems);
        expect(thrown.message).toContain('2 problems');
    });
});
