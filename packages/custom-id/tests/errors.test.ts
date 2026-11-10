import { describe, expect, it } from 'vite-plus/test';

import { CustomId } from '#src/CustomId';
import { setCustomIdErrors } from '#src/errors';

// the shared vitest setup resets modules before each file, so a swap here doesn't reach codec.test.ts

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
        // the default messages contain the prefix and detail too. the stale: and invalid: tags prove ours ran.
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
