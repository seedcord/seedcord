import { describe, expect, it } from 'vite-plus/test';

import { isTimezone } from '#src/isTimezone';
import { IANA_TIMEZONES } from '#src/types/Timezone';

const listed = new Set<string>(IANA_TIMEZONES);

describe('IanaTimezone', () => {
    it('lists every zone this Node supports', () => {
        const missing = Intl.supportedValuesOf('timeZone').filter((zone) => !listed.has(zone));

        expect(missing).toEqual([]);
    });

    it('lists only zones this Node supports', () => {
        const unknown = IANA_TIMEZONES.filter((zone) => !isTimezone(zone));

        expect(unknown).toEqual([]);
    });
});
