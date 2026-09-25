import { describe, expect, it } from 'vitest';

import { isPrerelease, replacementVersion, stableLineHeads } from '#src/versions';

import type { PackageIndexEntry } from '#remote/index-json';

const GATEWAY: PackageIndexEntry = {
    fullName: '@seedcord/gateway',
    stable: {
        latest: '0.7.1',
        latestByMinor: { '0.5': '0.5.1', '0.6': '0.6.2', '0.7': '0.7.1' },
        latestByMajor: { '0': '0.7.1' }
    },
    prerelease: { latest: '0.8.0-next.4' }
};

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

describe('replacementVersion', () => {
    it('moves a patch the index no longer lists to the newest patch of its minor', () => {
        expect(replacementVersion(GATEWAY, '0.6.0')).toBe('0.6.2');
        expect(replacementVersion(GATEWAY, '0.7.0')).toBe('0.7.1');
    });

    it('moves a version whose minor left the index to the newest of its major', () => {
        expect(replacementVersion(GATEWAY, '0.3.4')).toBe('0.7.1');
    });

    it('moves an older prerelease to the current one', () => {
        expect(replacementVersion(GATEWAY, '0.8.0-next.1')).toBe('0.8.0-next.4');
    });

    it('moves an older prerelease of the next patch to the current prerelease', () => {
        const entry: PackageIndexEntry = { ...GATEWAY, prerelease: { latest: '0.7.2-next.3' } };

        expect(replacementVersion(entry, '0.7.2-next.1')).toBe('0.7.2-next.3');
    });

    it('keeps a prerelease when only another major has anything newer', () => {
        const entry: PackageIndexEntry = {
            fullName: 'seedcord',
            stable: { latest: '1.8.0', latestByMinor: { '1.8': '1.8.0' }, latestByMajor: { '1': '1.8.0' } },
            prerelease: { latest: '2.0.0-next.1' }
        };

        expect(replacementVersion(entry, '1.9.0-next.1')).toBeNull();
    });

    it('moves a prerelease to its stable release once that ships', () => {
        expect(replacementVersion(GATEWAY, '0.7.0-next.3')).toBe('0.7.1');
    });

    it.each(['0.5.1', '0.6.2', '0.7.1', '0.8.0-next.4'])('keeps %s because the index still serves it', (version) => {
        expect(replacementVersion(GATEWAY, version)).toBeNull();
    });

    // an index cached from before a release does not list the version that release shipped
    it('keeps a version newer than anything in the index', () => {
        expect(replacementVersion(GATEWAY, '0.7.2')).toBeNull();
        expect(replacementVersion(GATEWAY, '0.9.0')).toBeNull();
    });

    it('keeps a backport newer than the head of its own minor', () => {
        expect(replacementVersion(GATEWAY, '0.6.3')).toBeNull();
    });

    it.each(['latest', 'next', '0.7', 'v0.7.1', ''])('returns null for %j, which is not a full version', (version) => {
        expect(replacementVersion(GATEWAY, version)).toBeNull();
    });

    it('moves a post-1.0 version to the newest of its major', () => {
        const entry: PackageIndexEntry = {
            fullName: 'seedcord',
            stable: { latest: '2.1.0', latestByMinor: {}, latestByMajor: { '1': '1.4.2', '2': '2.1.0' } },
            prerelease: null
        };

        expect(replacementVersion(entry, '1.2.0')).toBe('1.4.2');
    });
});
