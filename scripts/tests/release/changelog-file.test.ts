import { describe, expect, it } from 'vitest';

import { ChangelogFile } from '#src/release/ChangelogFile';

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

    it('skips prerelease sections when naming the stable version before a stable one', () => {
        const text = lines('# @seedcord/core', '', '## 0.4.0', '', '## 0.3.1-next.0', '', '## 0.3.0', '');

        expect(new ChangelogFile(text).versionBefore('0.4.0')).toBe('0.3.0');
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

    it('drops prerelease sections written in the emoji shape', () => {
        const out = pruned(
            lines(
                '# @seedcord/core',
                '',
                '## 0.8.0',
                '',
                '### ✨ Minor',
                '',
                '- Added a thing. ([#320](url))',
                '',
                '### 🩹 Patch',
                '',
                '#### 📦 Seedcord packages',
                '',
                '- `@seedcord/types` 0.13.0 → 0.14.0',
                '',
                '## 0.8.0-next.1',
                '',
                '### ✨ Minor',
                '',
                '- Added a thing. ([#320](url))',
                '',
                '## 0.8.0-next.0',
                '',
                '### 💥 Breaking',
                '',
                '- Renamed it. ([#319](url))',
                '',
                '## 0.7.0',
                '',
                '### ✨ Minor',
                '',
                '- Older. ([#311](url))',
                ''
            )
        );

        expect(out).not.toContain('-next.');
        expect(out).toContain('#### 📦 Seedcord packages\n\n- `@seedcord/types` 0.13.0 → 0.14.0\n\n## 0.7.0');
        expect(out.endsWith('- Older. ([#311](url))\n')).toBe(true);
    });

    it('drops a prerelease of a lower version that a later bump folded into the stable above', () => {
        const out = pruned(
            lines(
                '# @seedcord/core',
                '',
                '## 0.4.0',
                '',
                '### ✨ Minor',
                '',
                '- Added a thing.',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed a thing.',
                '',
                '## 0.4.0-next.1',
                '',
                '### ✨ Minor',
                '',
                '- Added a thing.',
                '',
                '## 0.3.1-next.0',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed a thing.',
                '',
                '## 0.3.0',
                '',
                '- older stable',
                ''
            )
        );

        expect(out).not.toContain('-next.');
        expect(out).toContain('## 0.3.0\n');
    });

    it('keeps a prerelease of a lower version whose entries the stable above never carried', () => {
        const out = pruned(
            lines(
                '# @seedcord/errors',
                '',
                '## 0.3.0',
                '',
                '### 💥 Breaking',
                '',
                '- Reworked the codes.',
                '',
                '## 0.2.2-next.0',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed a duplicate route.',
                '',
                '## 0.2.1',
                '',
                '- older stable',
                ''
            )
        );

        expect(out).toContain('## 0.2.2-next.0');
        expect(out).toContain('- Fixed a duplicate route.');
    });

    it('keeps a lower dependency-only prerelease that bumps a package the stable above never names', () => {
        const nested = (...deps: string[]): string[] => [
            '### 🩹 Patch',
            '',
            '#### 📦 Seedcord packages',
            '',
            ...deps,
            ''
        ];
        const out = pruned(
            lines(
                '# seedcord',
                '',
                '## 0.16.0',
                '',
                ...nested('- `@seedcord/types` 0.7.2 → 0.8.0'),
                '## 0.4.0-next.3',
                '',
                ...nested('- `@seedcord/services` 0.9.0-next.2 → 0.9.0-next.3'),
                '## 0.3.1',
                '',
                '- older stable',
                ''
            )
        );

        expect(out).toContain('## 0.4.0-next.3');
    });

    it('drops a lower dependency-only prerelease once the stable above bumps the same packages', () => {
        const nested = (...deps: string[]): string[] => [
            '### 🩹 Patch',
            '',
            '#### 📦 Seedcord packages',
            '',
            ...deps,
            ''
        ];
        const out = pruned(
            lines(
                '# @seedcord/utils',
                '',
                '## 0.8.0',
                '',
                ...nested('- `@seedcord/types` 0.7.1 → 0.8.0'),
                '## 0.7.1-next.0',
                '',
                ...nested('- `@seedcord/types` 0.7.1 → 0.7.2-next.0'),
                '## 0.7.0',
                '',
                '- older stable',
                ''
            )
        );

        expect(out).not.toContain('-next.');
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
