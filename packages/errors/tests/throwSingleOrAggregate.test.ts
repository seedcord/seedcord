import { assert, describe, expect, it } from 'vitest';

import { SeedcordErrorCode, isSeedcordError } from '#src/index';
import { SeedcordError, throwSingleOrAggregate } from '#src/internal.index';

const problem = (folder: string): SeedcordError =>
    new SeedcordError(SeedcordErrorCode.CliBuildRelativeFolder, [folder]);

describe('throwSingleOrAggregate', () => {
    it('returns when there are no problems', () => {
        expect(() => throwSingleOrAggregate([], SeedcordErrorCode.CliBuildFolderProblems)).not.toThrow();
    });

    it('throws a single problem as itself', () => {
        const only = problem('./handlers');

        expect(() => throwSingleOrAggregate([only], SeedcordErrorCode.CliBuildFolderProblems)).toThrow(only);
    });

    it('throws two or more problems as one aggregate carrying the count', () => {
        const problems = [problem('./handlers'), problem('./commands')];

        let thrown: unknown;
        try {
            throwSingleOrAggregate(problems, SeedcordErrorCode.CliBuildFolderProblems);
        } catch (error: unknown) {
            thrown = error;
        }

        assert(isSeedcordError(thrown, 'SeedcordAggregateError', SeedcordErrorCode.CliBuildFolderProblems));
        expect(thrown.errors).toEqual(problems);
        expect(thrown.message).toContain('2 folders');
    });
});
