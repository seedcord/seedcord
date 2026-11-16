import { describe, expect, it } from 'vite-plus/test';

import { errorReason } from '#src/misc/errorReason';

// pg throws this shape for localhost, since node tries ::1 and 127.0.0.1 and wraps both refusals
const refusedOnBothAddresses = Object.assign(
    new AggregateError(
        [new Error('connect ECONNREFUSED ::1:5432'), new Error('connect ECONNREFUSED 127.0.0.1:5432')],
        // eslint-disable-next-line unicorn/error-message -- pg's AggregateError has an empty message
        ''
    ),
    { code: 'ECONNREFUSED' }
);

describe('errorReason', () => {
    it.for([
        ['an error message, without its closing period', new Error('bad option.'), 'bad option'],
        [
            'the inner messages of an AggregateError with an empty message',
            refusedOnBothAddresses,
            'connect ECONNREFUSED ::1:5432, connect ECONNREFUSED 127.0.0.1:5432'
        ],
        [
            'the code of an error with an empty message',
            // eslint-disable-next-line unicorn/error-message -- the empty message is the case under test
            Object.assign(new Error(''), { code: 'ETIMEDOUT' }),
            'ETIMEDOUT'
        ],
        ['a thrown string', 'refused', 'refused']
    ] as const)('returns %s', ([, caught, reason]) => {
        expect(errorReason(caught)).toBe(reason);
    });
});
