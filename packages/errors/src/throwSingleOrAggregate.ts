import { SeedcordAggregateError } from './SeedcordError';

import type { SeedcordErrorCode } from './ErrorCodes';
import type { SeedcordErrorArguments } from './ErrorMessages';

type CountCode = {
    [Code in SeedcordErrorCode]: SeedcordErrorArguments<Code> extends [count: number] ? Code : never;
}[SeedcordErrorCode];

export function throwSingleOrAggregate(problems: readonly unknown[], code: CountCode): void {
    if (problems.length === 0) return;
    if (problems.length === 1) throw problems[0];
    throw new SeedcordAggregateError(code, problems, [problems.length]);
}
