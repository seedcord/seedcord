import { describe, expect, it } from 'vitest';

import { ChangelogSections } from '#src/release/ChangelogSections';

const lines = (...rows: string[]): string => `${rows.join('\n')}\n`;

const regrouped = (text: string): string => new ChangelogSections(text).regrouped().contents;

describe('ChangelogSections headings', () => {
    it('renames the bump headings', () => {
        const out = regrouped(
            lines(
                '# @seedcord/core',
                '',
                '## 0.8.0',
                '',
                '### Minor Changes',
                '',
                '- A thing changed. ([#310](url))',
                '',
                '### Patch Changes',
                '',
                '- Fixed a thing. ([#311](url))',
                ''
            )
        );

        expect(out).toContain('### ✨ Minor');
        expect(out).toContain('### 🩹 Patch');
        expect(out).not.toContain('Changes');
    });

    it('leaves a file with no sections alone', () => {
        const text = lines('# @seedcord/core', '');

        expect(regrouped(text)).toBe(text);
    });
});

describe('ChangelogSections breaking split', () => {
    it('moves a breaking entry above the minor one and drops the marker', () => {
        const out = regrouped(
            lines(
                '## 0.8.0',
                '',
                '### Minor Changes',
                '',
                '- **BREAKING:** Renamed `routeId` to `origin`. ([#311](url))',
                '- A thing changed. ([#310](url))',
                ''
            )
        );

        expect(out).toBe(
            lines(
                '## 0.8.0',
                '',
                '### 💥 Breaking',
                '',
                '- Renamed `routeId` to `origin`. ([#311](url))',
                '',
                '### ✨ Minor',
                '',
                '- A thing changed. ([#310](url))',
                ''
            )
        );
    });

    it('drops a bump section that had only breaking entries', () => {
        const out = regrouped(
            lines('## 0.8.0', '', '### Minor Changes', '', '- **BREAKING:** Everything moved. ([#311](url))', '')
        );

        expect(out).toContain('### 💥 Breaking');
        expect(out).not.toContain('✨ Minor');
    });

    it('keeps a continuation paragraph with its entry', () => {
        const out = regrouped(
            lines(
                '## 0.8.0',
                '',
                '### Minor Changes',
                '',
                '- **BREAKING:** Every handler takes a `DispatchContext`. ([#310](url))',
                '',
                '    The bag moved to `this.dispatch`.',
                ''
            )
        );

        expect(out).toContain('    The bag moved to `this.dispatch`.');
        expect(out.indexOf('The bag moved')).toBeGreaterThan(out.indexOf('Every handler takes'));
    });
});

describe('ChangelogSections dependency lines', () => {
    it('lifts the dependency lines into their own section', () => {
        const out = regrouped(
            lines(
                '## 0.8.0',
                '',
                '### Patch Changes',
                '',
                '- Fixed a thing. ([#311](url))',
                '- @seedcord/core 0.7.0 → 0.8.0',
                '- @seedcord/types 0.12.0 → 0.13.0',
                ''
            )
        );

        expect(out).toBe(
            lines(
                '## 0.8.0',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed a thing. ([#311](url))',
                '',
                '### 📦 Updated dependencies',
                '',
                '- @seedcord/core 0.7.0 → 0.8.0',
                '- @seedcord/types 0.12.0 → 0.13.0',
                ''
            )
        );
    });

    it('drops a patch section that carried only dependency lines', () => {
        const out = regrouped(lines('## 0.8.11', '', '### Patch Changes', '', '- @seedcord/core 0.7.0 → 0.8.0', ''));

        expect(out).toContain('### 📦 Updated dependencies');
        expect(out).not.toContain('🩹 Patch');
    });
});
