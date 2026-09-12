import { describe, expect, it } from 'vitest';

import { ChangelogFile } from '../lib/ChangelogFile';

const lines = (...rows: string[]): string => `${rows.join('\n')}\n`;

const changelog = lines(
    '# @seedcord/core',
    '',
    '## 0.7.0',
    '',
    '### Minor Changes',
    '',
    '- d4b9108: Added `dispatchId` to every bus key.',
    '',
    '## 0.6.0',
    '',
    '### Minor Changes',
    '',
    '- 4013669: Added a shutdown deadline.',
    ''
);

describe('ChangelogFile sections', () => {
    it('returns the section for a version', () => {
        const section = new ChangelogFile(changelog).sectionFor('0.7.0');

        expect(section).toContain('Added `dispatchId` to every bus key.');
        expect(section).not.toContain('shutdown deadline');
    });

    it('returns nothing for a version the file lacks', () => {
        expect(new ChangelogFile(changelog).sectionFor('9.9.9')).toBeUndefined();
    });

    it('names the version released before a given one', () => {
        expect(new ChangelogFile(changelog).versionBefore('0.7.0')).toBe('0.6.0');
        expect(new ChangelogFile(changelog).versionBefore('0.6.0')).toBeUndefined();
    });
});

describe('ChangelogFile prerelease pruning', () => {
    const pruned = (text: string): string => new ChangelogFile(text).withoutSupersededPrereleases().contents;

    it('drops a prerelease section once its stable version is present', () => {
        const out = pruned(
            lines('# @seedcord/core', '', '## 0.2.0', '', '- a thing', '', '## 0.2.0-next.0', '', '- a thing', '')
        );

        expect(out).not.toContain('0.2.0-next.0');
        expect(out).toContain('## 0.2.0\n');
    });

    it('keeps a prerelease that has no stable counterpart yet', () => {
        expect(pruned(lines('# @seedcord/core', '', '## 0.3.0-next.0', '', '- pending', ''))).toContain('0.3.0-next.0');
    });

    it('keeps prereleases of a restarted version line whose stable sits below as older history', () => {
        const out = pruned(
            lines(
                '# @seedcord/gateway',
                '',
                '## 0.1.0-next.1',
                '',
                '- pre1',
                '',
                '## 0.1.0-next.0',
                '',
                '- pre0',
                '',
                '## 0.1.0',
                '',
                '- ancient stable from before the rename',
                ''
            )
        );

        expect(out).toContain('## 0.1.0-next.1');
        expect(out).toContain('## 0.1.0-next.0');
        expect(out).toContain('## 0.1.0\n');
    });

    it('keeps a trailing note block when its section is pruned', () => {
        const out = pruned(
            lines(
                '# @seedcord/gateway',
                '',
                '## 0.1.0',
                '',
                '- stable release',
                '',
                '## 0.1.0-next.0',
                '',
                '- pre',
                '',
                '---',
                '',
                '#### Versions below were published as `seedcord`.',
                '',
                '---',
                '',
                '## 0.16.0-next.4',
                '',
                '- old line entry',
                ''
            )
        );

        expect(out).not.toContain('## 0.1.0-next.0');
        expect(out).toContain('#### Versions below were published as `seedcord`.');
        expect(out).toContain('## 0.16.0-next.4');
    });

    it('ends with a single newline when the pruned section was last', () => {
        const out = pruned(
            lines(
                '# @seedcord/tsconfig',
                '',
                '## 1.0.1',
                '',
                '- stable',
                '',
                '## 1.0.1-alpha.0',
                '',
                '- superseded',
                ''
            )
        );

        expect(out.endsWith('\n')).toBe(true);
        expect(out.endsWith('\n\n')).toBe(false);
    });

    it('drops every prerelease of a released version and repeats clean', () => {
        const once = pruned(
            lines(
                '# @seedcord/core',
                '',
                '## 0.2.0',
                '',
                '- stable',
                '',
                '## 0.2.0-next.1',
                '',
                '- pre1',
                '',
                '## 0.2.0-next.0',
                '',
                '- pre0',
                '',
                '## 0.1.0',
                '',
                '- older stable',
                ''
            )
        );

        expect(once).not.toContain('-next.');
        expect(once).toContain('## 0.2.0\n');
        expect(once).toContain('## 0.1.0\n');
        expect(pruned(once)).toBe(once);
    });
});

describe('ChangelogFile dependency lines', () => {
    const collapsed = (text: string): string => new ChangelogFile(text).withCollapsedDependencyLines().contents;

    it('folds a run into one line, keeping each commit once in order', () => {
        const out = collapsed(
            lines(
                '### Patch Changes',
                '',
                '- Updated dependencies [78377fa]',
                '- Updated dependencies [c3613bd]',
                '- Updated dependencies [0a19719]',
                '- Updated dependencies [78377fa]',
                '    - @seedcord/errors@0.6.0',
                ''
            )
        );

        expect(out).toBe(
            lines(
                '### Patch Changes',
                '',
                '- Updated dependencies [78377fa, c3613bd, 0a19719]',
                '    - @seedcord/errors@0.6.0',
                ''
            )
        );
    });

    it('leaves a single line alone', () => {
        const input = lines('- Updated dependencies [78377fa]', '    - @seedcord/errors@0.6.0', '');

        expect(collapsed(input)).toBe(input);
    });

    it('collapses each run on its own', () => {
        const out = collapsed(
            lines(
                '## 0.5.0',
                '',
                '- Updated dependencies [aaa1111]',
                '- Updated dependencies [aaa1111]',
                '    - @seedcord/types@0.11.0',
                '',
                '## 0.4.0',
                '',
                '- Updated dependencies [bbb2222]',
                '- Updated dependencies [ccc3333]',
                '    - @seedcord/types@0.10.0',
                ''
            )
        );

        expect(out).toContain('- Updated dependencies [aaa1111]\n');
        expect(out).toContain('- Updated dependencies [bbb2222, ccc3333]\n');
    });

    it('repeats clean', () => {
        const once = collapsed(
            lines(
                '- Updated dependencies [78377fa]',
                '- Updated dependencies [c3613bd]',
                '    - @seedcord/errors@0.6.0',
                ''
            )
        );

        expect(collapsed(once)).toBe(once);
    });
});
