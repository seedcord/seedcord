import { describe, expect, it } from 'vitest';

import { isPrerelease, stableLineHeads } from '#src/versions';

describe('versions', () => {
    it('detects prereleases', () => {
        expect(isPrerelease('1.0.0')).toBe(false);
        expect(isPrerelease('1.0.0-next.1')).toBe(true);
        expect(isPrerelease('0.11.0-alpha.2')).toBe(true);
    });

    it('derives distinct stable line heads, deduped and descending', () => {
        expect(
            stableLineHeads({
                latestByMinor: { '0.2': '0.2.4', '0.10': '0.10.6', '0.9': '0.9.4' },
                latestByMajor: { '0': '0.10.6', '1': '1.3.2' }
            })
        ).toEqual(['1.3.2', '0.10.6', '0.9.4', '0.2.4']);
    });
});
