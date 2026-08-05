import { describe, expect, it } from 'vitest';

import { findCloudflared, installHint } from '@commands/dev/tunnel/cloudflared';

import type { PathLookup } from '@commands/dev/tunnel/cloudflared';

function lookup(overrides: Partial<PathLookup> = {}): PathLookup {
    return {
        pathVar: '/usr/bin:/opt/homebrew/bin',
        pathExt: undefined,
        platform: 'darwin',
        delimiter: ':',
        exists: () => false,
        ...overrides
    };
}

describe('findCloudflared', () => {
    it('returns the first PATH entry holding the binary', () => {
        const found = findCloudflared(lookup({ exists: (candidate) => candidate === '/opt/homebrew/bin/cloudflared' }));

        expect(found).toBe('/opt/homebrew/bin/cloudflared');
    });

    it('returns undefined when no PATH entry holds it', () => {
        expect(findCloudflared(lookup())).toBeUndefined();
    });

    it('returns undefined when PATH is unset', () => {
        expect(findCloudflared(lookup({ pathVar: undefined, exists: () => true }))).toBeUndefined();
    });

    it('returns the windows candidate that exists', () => {
        const found = findCloudflared(
            lookup({
                platform: 'win32',
                pathVar: String.raw`C:\tools`,
                pathExt: '.COM;.EXE;.CMD',
                delimiter: ';',
                exists: (candidate) => candidate.endsWith('.EXE')
            })
        );

        expect(found).toMatch(/cloudflared\.EXE$/);
    });
});

describe('installHint', () => {
    it('names the package manager for macos and windows', () => {
        expect(installHint('darwin')).toBe('brew install cloudflared');
        expect(installHint('win32')).toBe('winget install -e --id Cloudflare.cloudflared');
    });

    it('points elsewhere at the download page', () => {
        expect(installHint('linux')).toContain('developers.cloudflare.com');
    });
});
