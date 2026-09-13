import { describe, expect, it } from 'vitest';

import { changesetPathsFromFiles, maxBump } from '#src/release/changeset-bumps';

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

    it('ignores a package released as none', () => {
        expect(maxBump([changeset("'@seedcord/a': none")])).toBeNull();
    });

    it('handles CRLF line endings and double-quoted keys', () => {
        expect(maxBump(['---\r\n"@seedcord/a": minor\r\n---\r\n'])).toBe('minor');
    });

    it('throws on a body with no frontmatter block', () => {
        expect(() => maxBump(['just a summary, no frontmatter'])).toThrow(/frontmatter/);
    });

    it('throws on a frontmatter value that names no bump', () => {
        expect(() => maxBump([changeset("'@seedcord/a': patch\nnote: ignore me")])).toThrow(/version type/);
    });
});

describe('changesetPathsFromFiles', () => {
    it('yields nothing for a PR that adds no changeset (a CI-only PR)', () => {
        const files = [
            { filename: '.github/workflows/checks.yml', status: 'modified' },
            { filename: '.github/workflows/coverage.yml', status: 'modified' }
        ];
        expect(changesetPathsFromFiles(files)).to.deep.equal([]);
    });

    it('picks up a changeset the PR adds or edits', () => {
        const files = [
            { filename: '.changeset/strict-converters.md', status: 'added' },
            { filename: '.changeset/existing-edit.md', status: 'modified' },
            { filename: 'packages/envapt/src/x.ts', status: 'modified' }
        ];
        expect(changesetPathsFromFiles(files)).to.deep.equal([
            '.changeset/strict-converters.md',
            '.changeset/existing-edit.md'
        ]);
    });

    it('skips the changeset README and removed changesets', () => {
        const files = [
            { filename: '.changeset/README.md', status: 'modified' },
            { filename: '.changeset/dropped.md', status: 'removed' }
        ];
        expect(changesetPathsFromFiles(files)).to.deep.equal([]);
    });
});
