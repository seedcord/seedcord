import { describe, expect, it } from 'vitest';

import { ReleaseEntries } from '#src/release/ReleaseEntries';
import { ReleaseNotes } from '#src/release/ReleaseNotes';

const lines = (...rows: string[]): string => `${rows.join('\n')}\n`;

const CORE = lines(
    '# @seedcord/core',
    '',
    '## 0.7.0',
    '',
    '### 💥 Breaking',
    '',
    '- Renamed `routeId` to `origin`. ([#311](url))',
    '',
    '### ✨ Minor',
    '',
    '- Added `dispatchId` to every bus key. ([#311](url))',
    ''
);

const GATEWAY = lines(
    '# @seedcord/gateway',
    '',
    '## 0.6.0',
    '',
    '### ✨ Minor',
    '',
    '- Added `dispatchId` to every bus key. ([#311](url))',
    ''
);

const UTILS = lines('# @seedcord/utils', '');

const published = [
    { name: '@seedcord/core', version: '0.7.0', oldVersion: '0.6.0', directory: 'packages/core', changelog: CORE },
    {
        name: '@seedcord/gateway',
        version: '0.6.0',
        oldVersion: '0.5.1',
        directory: 'packages/gateway',
        changelog: GATEWAY
    },
    { name: '@seedcord/utils', version: '0.8.11', oldVersion: '0.8.10', directory: 'packages/utils', changelog: UTILS }
];

const notes = (): string =>
    new ReleaseNotes({
        repo: 'seedcord/seedcord',
        tag: 'release-2026.09.11',
        published,
        entries: new ReleaseEntries(published)
    }).body();

describe('ReleaseNotes', () => {
    it('ends with links to the diff and the previous release', () => {
        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.09.20',
            previousTag: 'release-2026.09.11',
            published,
            entries: new ReleaseEntries(published)
        }).body();

        expect(
            body.endsWith(
                '\n\n---\n\n<sub>[See what changed](https://github.com/seedcord/seedcord/compare/release-2026.09.11...release-2026.09.20) since the [last release](https://github.com/seedcord/seedcord/releases/tag/release-2026.09.11)</sub>\n'
            )
        ).toBe(true);
    });

    it('leaves the links off when no release came before', () => {
        expect(notes()).not.toContain('See what changed');
    });

    it('tables every package that carries its own entries', () => {
        const body = notes();

        expect(body).toContain(
            '| [@seedcord/core](https://github.com/seedcord/seedcord/blob/release-2026.09.11/packages/core/CHANGELOG.md#070) | 0.6.0 → 0.7.0 |'
        );
    });

    it('links a changelog to the heading github renders for its version', () => {
        expect(notes()).toContain('/packages/gateway/CHANGELOG.md#060) | 0.5.1 → 0.6.0 |');
    });

    it('marks a first publish as new', () => {
        const kit = {
            name: '@seedcord/kit',
            version: '0.1.0',
            directory: 'packages/kit',
            changelog: GATEWAY.replace('0.6.0', '0.1.0')
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.09.11',
            published: [kit],
            entries: new ReleaseEntries([kit])
        }).body();

        expect(body).toContain('/packages/kit/CHANGELOG.md#010) | 0.1.0 (new) |');
    });

    it('collapses the dependency-only packages behind a summary', () => {
        const body = notes();

        expect(body).toContain('<summary>1 more published with seedcord dependency bumps only</summary>');
        expect(body).toContain('- `@seedcord/utils` 0.8.11');
        expect(body).toContain('</details>');
    });

    it('prefixes an entry with every package it covers', () => {
        const body = notes();

        expect(body).toContain('## 💥 Breaking changes');
        expect(body).toContain('- **core**: Renamed `routeId` to `origin`. ([#311](url))');
        expect(body).toContain('- **core, gateway**: Added `dispatchId` to every bus key. ([#311](url))');
    });

    it('thanks a contributor with a bare mention where the changelog links their profile', () => {
        const thanked = {
            name: '@seedcord/utils',
            version: '0.8.12',
            directory: 'packages/utils',
            changelog: lines(
                '# @seedcord/utils',
                '',
                '## 0.8.12',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed `renderTable`. ([#323](url), thanks [@alice](https://github.com/alice) and [@bob](https://github.com/bob))',
                ''
            )
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.10.03',
            published: [thanked],
            entries: new ReleaseEntries([thanked])
        }).body();

        expect(body).toContain('- **utils**: Fixed `renderTable`. ([#323](url), thanks @alice and @bob)');
    });

    it('turns a pull request or commit link into the bare reference github links itself', () => {
        const linked = {
            name: '@seedcord/utils',
            version: '0.8.12',
            directory: 'packages/utils',
            changelog: lines(
                '# @seedcord/utils',
                '',
                '## 0.8.12',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed `renderTable`. ([#323](https://github.com/seedcord/seedcord/pull/323))',
                '- Fixed `wrapText`. ([`4a3318c`](https://github.com/seedcord/seedcord/commit/4a3318c91e4466acac62a09eb934d8b785e7700d))',
                ''
            )
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.10.03',
            published: [linked],
            entries: new ReleaseEntries([linked])
        }).body();

        expect(body).toContain('Fixed `renderTable`. (#323)');
        expect(body).toContain('Fixed `wrapText`. (4a3318c91e4466acac62a09eb934d8b785e7700d)');
    });

    it('leaves out a bucket that carries no entry', () => {
        expect(notes()).not.toContain('🩹 Patch changes');
    });
});
