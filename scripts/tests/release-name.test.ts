import { describe, expect, it } from 'vitest';

import { ReleaseName } from '#src/release/ReleaseName';

const AT = Temporal.Instant.from('2026-09-11T02:03:07Z');

describe('ReleaseName', () => {
    it('names the tag and the title from the utc date', () => {
        const name = new ReleaseName(AT, []);

        expect(name.tag).toBe('release-2026.09.11');
        expect(name.title).toBe('September 11, 2026');
    });

    it('adds a letter when the day already carries a release', () => {
        const name = new ReleaseName(AT, ['release-2026.09.11']);

        expect(name.tag).toBe('release-2026.09.11a');
        expect(name.title).toBe('September 11, 2026 (2)');
    });

    it('walks the alphabet for a third publish that day', () => {
        const name = new ReleaseName(AT, ['release-2026.09.11', 'release-2026.09.11a']);

        expect(name.tag).toBe('release-2026.09.11b');
        expect(name.title).toBe('September 11, 2026 (3)');
    });

    it('reads the day in utc when the local clock still says yesterday', () => {
        const name = new ReleaseName(Temporal.Instant.from('2026-09-11T02:03:07Z'), []);

        expect(name.tag).toBe('release-2026.09.11');
    });

    it('leaves tags from other days out of the count', () => {
        const name = new ReleaseName(AT, ['release-2026.09.10', 'release-2025.09.11', 'v1.2.3']);

        expect(name.tag).toBe('release-2026.09.11');
    });
});
