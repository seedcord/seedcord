import { describe, expect, it } from 'vitest';

import { CustomId } from '#src/CustomId';
import { setCustomIdErrors } from '#src/errors';

// vitest gives each test file its own module registry. a swap here never reaches codec.test.ts.

class OwnStale extends Error {}
class OwnInvalid extends Error {}

const Report = new CustomId('report').snowflake('claimedBy');
const Reshaped = new CustomId('report').snowflake('claimedBy', { nullable: true });

describe('setCustomIdErrors', () => {
    it('throws what the registered constructors return', () => {
        setCustomIdErrors({
            stale: (prefix) => new OwnStale(prefix),
            invalid: (detail) => new OwnInvalid(detail)
        });

        const stale = Report.encode({ claimedBy: '853472916483920128' });
        expect(() => Reshaped.decode(stale)).toThrow(OwnStale);
        expect(() => Report.decode('zzz000:A')).toThrow(OwnInvalid);
    });

    it('hands the prefix to stale and a detail to invalid', () => {
        // the default messages carry the prefix and the detail too. the tags tell the two apart.
        setCustomIdErrors({
            stale: (prefix) => new OwnStale(`stale:${prefix}`),
            invalid: (detail) => new OwnInvalid(`invalid:${detail}`)
        });

        const stale = Report.encode({ claimedBy: '853472916483920128' });
        expect(() => Reshaped.decode(stale)).toThrow('stale:report');
        expect(() => Report.decode('zzz000:A')).toThrow('invalid:routeKey "zzz000" is not');
    });

    it('lets the last call win', () => {
        class Later extends Error {}
        setCustomIdErrors({ stale: (p) => new OwnStale(p), invalid: (d) => new OwnInvalid(d) });
        setCustomIdErrors({ stale: (p) => new Later(p), invalid: (d) => new Later(d) });

        expect(() => Report.decode('zzz000:A')).toThrow(Later);
    });
});
