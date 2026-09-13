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
    it('tables every package that carries its own entries', () => {
        const body = notes();

        expect(body).toContain(
            '| [@seedcord/core](https://github.com/seedcord/seedcord/blob/release-2026.09.11/packages/core/CHANGELOG.md) | 0.6.0 → 0.7.0 |'
        );
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

        expect(body).toContain('/packages/kit/CHANGELOG.md) | 0.1.0 (new) |');
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

    it('leaves out a bucket that carries no entry', () => {
        expect(notes()).not.toContain('🩹 Patch changes');
    });

    it('separates a continuation paragraph from the entry after it', () => {
        const withParagraph = lines(
            '# @seedcord/http',
            '',
            '## 0.8.0',
            '',
            '### 💥 Breaking',
            '',
            '- Every handler takes a `DispatchContext`. ([#310](url))',
            '',
            '    The node host runs the chain before its gates.',
            '',
            '- A second breaking entry. ([#311](url))',
            ''
        );

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.09.11',
            published: [
                {
                    name: '@seedcord/http',
                    version: '0.8.0',
                    oldVersion: '0.7.0',
                    directory: 'packages/http',
                    changelog: withParagraph
                }
            ],
            entries: new ReleaseEntries([{ name: '@seedcord/http', version: '0.8.0', changelog: withParagraph }])
        }).body();

        expect(body).toContain('    The node host runs the chain before its gates.\n\n- **http**: A second breaking');
    });
});
