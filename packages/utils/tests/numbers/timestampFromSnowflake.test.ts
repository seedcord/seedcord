import { describe, expect, it } from 'vitest';

import { timestampFromSnowflake } from '../../src/numbers/timestampFromSnowflake';

describe('timestampFromSnowflake', () => {
    it('decodes the discord docs example snowflake', () => {
        expect(timestampFromSnowflake('175928847299117063')).toBe(1_462_015_105_796);
    });

    it('decodes a snowflake minted at the discord epoch', () => {
        expect(timestampFromSnowflake('0')).toBe(1_420_070_400_000);
    });

    it('throws on a non-numeric string', () => {
        expect(() => timestampFromSnowflake('not-a-snowflake')).toThrow(SyntaxError);
    });
});
