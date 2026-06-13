import { describe, expect, it } from 'vitest';

import { buildPurgeBody } from '../docs/purge-args';

describe('buildPurgeBody', () => {
    it('purges everything when no targeting flags are passed', () => {
        expect(buildPurgeBody([])).toEqual({ purge_everything: true });
        expect(buildPurgeBody(['--dry-run'])).toEqual({ purge_everything: true });
    });

    it('purges the full URLs given after --files', () => {
        expect(buildPurgeBody(['--files', 'https://cdn.seedcord.org/index.json'])).toEqual({
            files: ['https://cdn.seedcord.org/index.json']
        });
    });

    it('purges by URL prefix given after --prefixes', () => {
        expect(buildPurgeBody(['--prefixes', 'docs.seedcord.org/packages/seedcord'])).toEqual({
            prefixes: ['docs.seedcord.org/packages/seedcord']
        });
    });

    it('collects every value after a list flag until the next flag', () => {
        expect(buildPurgeBody(['--prefixes', 'a.example.com', 'b.example.com', '--dry-run'])).toEqual({
            prefixes: ['a.example.com', 'b.example.com']
        });
    });

    it('prefers prefixes over files when both flags are passed', () => {
        expect(
            buildPurgeBody(['--files', 'https://cdn.seedcord.org/index.json', '--prefixes', 'cdn.seedcord.org'])
        ).toEqual({
            prefixes: ['cdn.seedcord.org']
        });
    });

    it('throws when a targeting flag is passed with no values, rather than purging the whole zone', () => {
        expect(() => buildPurgeBody(['--prefixes'])).toThrow(/--prefixes/);
        expect(() => buildPurgeBody(['--prefixes', '--dry-run'])).toThrow(/--prefixes/);
        expect(() => buildPurgeBody(['--files'])).toThrow(/--files/);
    });
});
