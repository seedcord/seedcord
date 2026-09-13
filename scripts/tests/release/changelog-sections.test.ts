import { describe, expect, it } from 'vitest';

import { ChangelogSections } from '#src/release/ChangelogSections';

const lines = (...rows: string[]): string => `${rows.join('\n').replace(/\n+$/, '')}\n`;

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

    it('files a major bump under breaking', () => {
        const out = regrouped(
            lines('## 3.0.0', '', '### Major Changes', '', '- Dropped the `legacy` preset. ([#400](url))', '')
        );

        expect(out).toContain('### 💥 Breaking\n\n- Dropped the `legacy` preset. ([#400](url))');
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

describe('ChangelogSections marker placement', () => {
    it('leaves the labels inside an older breaking entry as they are', () => {
        const text = lines(
            '## 0.1.0',
            '',
            '### 💥 Breaking',
            '',
            '- Added checkbox builders. ([#136](url))',
            '    - **BREAKING:** Renamed `ActionRowComponentType` to `RowType`.',
            '',
            '    **BREAKING:** a plugin constructor takes `CoreBase` first.',
            ''
        );

        expect(regrouped(text)).toBe(text);
    });
});

describe('ChangelogSections text it does not recognize', () => {
    it('leaves a version alone when a section carries an unknown #### heading', () => {
        const text = lines(
            '## 0.1.0',
            '',
            '### Minor Changes',
            '',
            '- A thing. ([#1](url))',
            '',
            '#### Notes',
            '',
            'Read this.',
            ''
        );

        expect(regrouped(text)).toBe(text);
    });

    it('leaves a version alone when text sits above the first entry', () => {
        const text = lines(
            '## 0.1.0',
            '',
            '### Minor Changes',
            '',
            'Hand-written intro.',
            '',
            '- A thing. ([#1](url))',
            ''
        );

        expect(regrouped(text)).toBe(text);
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
                '- `@seedcord/core` 0.7.0 → 0.8.0',
                '- `@seedcord/types` 0.12.0 → 0.13.0',
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
                '#### 📦 Seedcord packages',
                '',
                '- `@seedcord/core` 0.7.0 → 0.8.0',
                '- `@seedcord/types` 0.12.0 → 0.13.0',
                ''
            )
        );
    });

    it('repeats clean', () => {
        const once = regrouped(
            lines(
                '# @seedcord/core',
                '',
                '## 0.8.0',
                '',
                '### Minor Changes',
                '',
                '- **BREAKING:** Renamed `routeId` to `origin`. ([#311](url))',
                '- A thing changed. ([#310](url))',
                '',
                '### Patch Changes',
                '',
                '- Fixed a thing. ([#312](url))',
                '- `@seedcord/core` 0.7.0 → 0.8.0',
                ''
            )
        );

        expect(regrouped(once)).toBe(once);
    });

    it('separates a continuation paragraph from the nested block', () => {
        const out = regrouped(
            lines(
                '## 0.6.0',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed a thing. ([#308](url))',
                '',
                '    A continuation paragraph.',
                '',
                '- `@seedcord/errors` 0.6.0 → 0.7.0',
                ''
            )
        );

        expect(out).toContain('    A continuation paragraph.\n\n#### 📦 Seedcord packages');
        expect(out).toContain('#### 📦 Seedcord packages\n\n- `@seedcord/errors` 0.6.0 → 0.7.0');
    });

    it('keeps an entry with an arrow in its prose among the entries', () => {
        const out = regrouped(lines('## 0.8.0', '', '### Minor Changes', '', '- Renamed `Foo` → `Bar`', ''));

        expect(out).toContain('### ✨ Minor\n\n- Renamed `Foo` → `Bar`');
        expect(out).not.toContain('📦');
    });

    it('files a first dependency on a package into the nested block', () => {
        const out = regrouped(
            lines(
                '## 0.16.0',
                '',
                '### Patch Changes',
                '',
                '- Fixed a thing. ([#196](url))',
                '- `@seedcord/core` 0.1.0 (new)',
                '- `@seedcord/types` 0.7.2 → 0.8.0',
                ''
            )
        );

        expect(out).toContain(
            '#### 📦 Seedcord packages\n\n- `@seedcord/core` 0.1.0 (new)\n- `@seedcord/types` 0.7.2 → 0.8.0\n'
        );
        expect(regrouped(out)).toBe(out);
    });

    it('keeps the patch heading when the bumps are the only change', () => {
        const out = regrouped(lines('## 0.8.11', '', '### Patch Changes', '', '- `@seedcord/core` 0.7.0 → 0.8.0', ''));

        expect(out).toBe(
            lines(
                '## 0.8.11',
                '',
                '### 🩹 Patch',
                '',
                '#### 📦 Seedcord packages',
                '',
                '- `@seedcord/core` 0.7.0 → 0.8.0',
                ''
            )
        );
    });
});
