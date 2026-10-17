import { describe, expect, it, vi } from 'vite-plus/test';

import { ReleaseName } from '#src/release/ReleaseName';

const AT = Temporal.Instant.from('2026-09-11T02:03:07Z');

describe('ReleaseName', () => {
    it('names the tag and the title from the utc date', () => {
        const name = ReleaseName.next(AT, []);

        expect(name.tag).toBe('release-2026.09.11');
        expect(name.title).toBe('September 11, 2026');
    });

    it('adds a letter when the day already carries a release', () => {
        const name = ReleaseName.next(AT, ['release-2026.09.11']);

        expect(name.tag).toBe('release-2026.09.11a');
        expect(name.title).toBe('September 11, 2026 (2)');
    });

    it('walks the alphabet for a third publish that day', () => {
        const name = ReleaseName.next(AT, ['release-2026.09.11', 'release-2026.09.11a']);

        expect(name.tag).toBe('release-2026.09.11b');
        expect(name.title).toBe('September 11, 2026 (3)');
    });

    it('reads the day in utc when the local clock still says yesterday', () => {
        vi.stubEnv('TZ', 'America/Los_Angeles');

        try {
            expect(AT.toZonedDateTimeISO(Temporal.Now.timeZoneId()).day).toBe(10);

            const name = ReleaseName.next(AT, []);
            expect(name.tag).toBe('release-2026.09.11');
            expect(name.title).toBe('September 11, 2026');
        } finally {
            vi.unstubAllEnvs();
        }
    });

    it('reads the tag and title back from a tag already on the commit', () => {
        const name = ReleaseName.fromTag('release-2026.09.11');

        expect(name.tag).toBe('release-2026.09.11');
        expect(name.title).toBe('September 11, 2026');
    });

    it('reads the publish count back from a lettered tag', () => {
        const name = ReleaseName.fromTag('release-2026.09.11b');

        expect(name.tag).toBe('release-2026.09.11b');
        expect(name.title).toBe('September 11, 2026 (3)');
    });

    it('rejects a tag outside the release scheme', () => {
        expect(() => ReleaseName.fromTag('v1.2.3')).toThrow(/v1\.2\.3/);
    });

    it('picks the newest release tag before its own as the previous release', () => {
        const name = ReleaseName.fromTag('release-2026.09.20');
        const tags = [
            'release-2026.09.25',
            'release-2026.09.11a',
            'v1.2.3',
            'release-2026.09.20',
            'release-2026.09.11'
        ];

        expect(name.previousIn(tags)).toBe('release-2026.09.11a');
    });

    it('picks the earlier lettered tag from the same day', () => {
        const name = ReleaseName.fromTag('release-2026.09.11b');

        expect(name.previousIn(['release-2026.09.11b', 'release-2026.09.11', 'release-2026.09.11a'])).toBe(
            'release-2026.09.11a'
        );
    });

    it('finds no previous release when none came before', () => {
        const name = ReleaseName.fromTag('release-2026.09.11');

        expect(name.previousIn(['release-2026.09.11', 'release-2026.09.12', '@seedcord/core@0.7.0'])).toBeUndefined();
    });

    it('leaves tags from other days out of the count', () => {
        const name = ReleaseName.next(AT, ['release-2026.09.10', 'release-2025.09.11', 'v1.2.3']);

        expect(name.tag).toBe('release-2026.09.11');
    });
});
