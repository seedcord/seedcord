import { describe, expect, it } from 'vitest';

import { maxBump } from '../semver-label';

const changeset = (frontmatter: string): string => `---\n${frontmatter}\n---\n\nSome description.`;

describe('maxBump', () => {
    it('returns null when there are no changesets', () => {
        expect(maxBump([])).toBeNull();
    });

    it('takes the highest bump across separate changesets', () => {
        const bodies = [
            changeset("'@seedcord/a': patch"),
            changeset("'@seedcord/b': major"),
            changeset("'@seedcord/c': minor")
        ];
        expect(maxBump(bodies)).toBe('major');
    });

    it('reads every package in a single changeset', () => {
        expect(maxBump([changeset("'@seedcord/a': patch\n'@seedcord/b': minor")])).toBe('minor');
    });

    it('ignores a changeset body with no bump lines', () => {
        expect(maxBump([changeset('')])).toBeNull();
    });
});
