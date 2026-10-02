import { describe, expect, it } from 'vitest';

import { SiteBuild } from '#src/SiteBuild';

describe('SiteBuild', () => {
    it('keeps each render in its own folder', () => {
        const build = new SiteBuild('20261002T051234Z-ba35d6b');

        expect(build.folder).toBe('builds/20261002T051234Z-ba35d6b/');
        expect(build.key('packages/core/latest.html')).toBe(
            'builds/20261002T051234Z-ba35d6b/packages/core/latest.html'
        );
    });

    it('builds the id from a time and a commit sha', () => {
        expect(SiteBuild.at(new Date('2026-10-02T05:12:34.567Z'), 'ba35d6b').id).toBe('20261002T051234Z-ba35d6b');
    });

    it('reads the id back from a folder', () => {
        expect(SiteBuild.fromFolder('builds/20261002T051234Z-ba35d6b/')?.id).toBe('20261002T051234Z-ba35d6b');
        expect(SiteBuild.fromFolder('packages/')).toBeUndefined();
    });

    it('orders builds by the time in their id', () => {
        const older = new SiteBuild('20261001T000000Z-aaaaaaa');
        const newer = new SiteBuild('20261002T000000Z-bbbbbbb');

        expect(older.isOlderThan(newer)).toBe(true);
        expect(newer.isOlderThan(older)).toBe(false);
    });

    it('rejects an id without a UTC timestamp and a commit sha', () => {
        expect(() => new SiteBuild('latest')).toThrow(/20261002T051234Z-<commit sha>/);
        expect(() => new SiteBuild('20261002T051234Z')).toThrow(RangeError);
    });
});
