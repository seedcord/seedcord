import { describe, expect, it } from 'vite-plus/test';

import { tidyChangelog } from '#src/release/tidy';

const lines = (...rows: string[]): string => `${rows.join('\n')}\n`;

describe('tidyChangelog', () => {
    it('keeps a hand-written note when it prunes the prerelease above it', () => {
        const out = tidyChangelog(
            lines(
                '# @seedcord/gateway',
                '',
                '## 0.1.0',
                '',
                '### ✨ Minor',
                '',
                '- Split into scoped packages. ([#175](url))',
                '',
                '## 0.1.0-next.0',
                '',
                '### ✨ Minor',
                '',
                '- Split into scoped packages. ([#175](url))',
                '',
                '---',
                '',
                '#### Versions below were published as `seedcord`.',
                '',
                '---',
                '',
                '## 0.16.0-next.4',
                '',
                '### ✨ Minor',
                '',
                '- Older line. ([#170](url))',
                ''
            )
        );

        expect(out).toContain(
            '- Split into scoped packages. ([#175](url))\n\n---\n\n#### Versions below were published as `seedcord`.\n\n---\n\n## 0.16.0-next.4'
        );
        expect(out).not.toContain('0.1.0-next.0');
        expect(tidyChangelog(out)).toBe(out);
    });

    it('starts a graduated dependency bump at the last stable version', () => {
        const out = tidyChangelog(
            lines(
                '# @seedcord/gateway',
                '',
                '## 0.11.1',
                '',
                '### 🩹 Patch',
                '',
                '#### 📦 Seedcord packages',
                '',
                '- `@seedcord/core` 0.14.1-next.1 → 0.14.1',
                '',
                '## 0.11.1-next.1',
                '',
                '### 🩹 Patch',
                '',
                '#### 📦 Seedcord packages',
                '',
                '- `@seedcord/core` 0.14.1-next.0 → 0.14.1-next.1',
                '',
                '## 0.11.1-next.0',
                '',
                '### 🩹 Patch',
                '',
                '#### 📦 Seedcord packages',
                '',
                '- `@seedcord/core` 0.14.0 → 0.14.1-next.0',
                '',
                '## 0.11.0',
                ''
            )
        );

        expect(out).toContain(
            '## 0.11.1\n\n### 🩹 Patch\n\n#### 📦 Seedcord packages\n\n- `@seedcord/core` 0.14.0 → 0.14.1\n'
        );
        expect(tidyChangelog(out)).toBe(out);
    });

    it('adds a peer bump that only a prerelease entry lists', () => {
        const out = tidyChangelog(
            lines(
                '# @seedcord/plugin-i18n',
                '',
                '## 0.1.1',
                '',
                'No changes in this release.',
                '',
                '## 0.1.1-next.0',
                '',
                '### 🩹 Patch',
                '',
                '#### 📦 Seedcord packages',
                '',
                '- `@seedcord/core` 0.14.0 → 0.14.1-next.0',
                '',
                '## 0.1.0',
                ''
            )
        );

        expect(out).toBe(
            lines(
                '# @seedcord/plugin-i18n',
                '',
                '## 0.1.1',
                '',
                '### 🩹 Patch',
                '',
                '#### 📦 Seedcord packages',
                '',
                '- `@seedcord/core` 0.14.0 → 0.14.1',
                '',
                '## 0.1.0'
            )
        );
        expect(tidyChangelog(out)).toBe(out);
    });

    it('prunes a breaking prerelease in the same run that graduates it', () => {
        const out = tidyChangelog(
            lines(
                '# @seedcord/core',
                '',
                '## 0.7.0',
                '',
                '### Minor Changes',
                '',
                '- **BREAKING:** Removed `x`. ([#1](url))',
                '',
                '## 0.6.1-next.0',
                '',
                '### 💥 Breaking',
                '',
                '- Removed `x`. ([#1](url))',
                '',
                '## 0.6.0',
                '',
                '### ✨ Minor',
                '',
                '- Older. ([#0](url))',
                ''
            )
        );

        expect(out).not.toContain('-next.');
        expect(tidyChangelog(out)).toBe(out);
    });
});
