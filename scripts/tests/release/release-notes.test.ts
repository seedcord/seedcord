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

    it('counts each package change by kind, with the shared ones in their own column', () => {
        const body = notes();

        expect(body).toContain(
            '| [`@seedcord/core`](https://github.com/seedcord/seedcord/blob/release-2026.09.11/packages/core/CHANGELOG.md#070) | 0.6.0 → 0.7.0 | 1 |  |  |  | 1 |'
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

    it('tables a package that only took dependency bumps with no counts', () => {
        expect(notes()).toContain('/packages/utils/CHANGELOG.md#0811) | 0.8.10 → 0.8.11 |  |  |  |  |  |');
    });

    it('upgrades the scoped packages by pattern and every other installed one by name', () => {
        const cli = { name: 'seedcord', version: '0.21.3', directory: 'cli/seedcord', changelog: '# seedcord\n' };
        const create = {
            name: 'create-seedcord',
            version: '0.4.0',
            commandOnly: true as const,
            directory: 'cli/create-seedcord',
            changelog: '# create-seedcord\n'
        };
        const all = [...published, cli, create];

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.10.03',
            published: all,
            entries: new ReleaseEntries(all)
        }).body();

        expect(body).toContain('```sh\npnpm up --latest "@seedcord/*" seedcord\n```');
        expect(body).toContain('npx npm-check-updates -u --filter "@seedcord/*,seedcord" && npm install');
    });

    it('keeps the later paragraphs of a shared change out of a code block', () => {
        const entry = '- Added `shutdownDeadline`. ([#309](url))\n\n    A zero deadline throws.';
        const both = ['@seedcord/core', '@seedcord/errors'].map((name) => ({
            name,
            version: '0.7.0',
            directory: `packages/${name.replace('@seedcord/', '')}`,
            changelog: lines(`# ${name}`, '', '## 0.7.0', '', '### ✨ Minor', '', entry, '')
        }));

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.09.09',
            published: both,
            entries: new ReleaseEntries(both)
        }).body();

        expect(body).toContain(
            '#### ✨ Added `shutdownDeadline`. ([#309](url))\n\nA zero deadline throws.\n\n`core` `errors`'
        );
    });

    it('groups the entries of a package by kind, each group under its label', () => {
        const mixed = {
            name: '@seedcord/utils',
            version: '0.8.12',
            oldVersion: '0.8.11',
            directory: 'packages/utils',
            changelog: lines(
                '# @seedcord/utils',
                '',
                '## 0.8.12',
                '',
                '### 🩹 Patch',
                '',
                '- Reworded the README. ([#1](url))',
                '- Fixed `renderTable`. ([#2](url))',
                '- Renamed an internal helper. ([#3](url))',
                ''
            )
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.10.03',
            published: [mixed],
            entries: new ReleaseEntries([mixed])
        }).body();

        expect(body).toContain(
            [
                '**🐛 Fixed**',
                '- Fixed `renderTable`. ([#2](url))',
                '**🔧 Changed**',
                '- Reworded the README. ([#1](url))\n- Renamed an internal helper. ([#3](url))'
            ].join('\n\n')
        );
    });

    it('files a fix written with an older opener like "Fixes" under fixed', () => {
        const fixed = {
            name: '@seedcord/core',
            version: '0.2.1',
            directory: 'packages/core',
            changelog: lines(
                '# @seedcord/core',
                '',
                '## 0.2.1',
                '',
                '### 🩹 Patch',
                '',
                '- Fixes the shutdown hang.',
                ''
            )
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.08.03',
            published: [fixed],
            entries: new ReleaseEntries([fixed])
        }).body();

        expect(body).toContain('**🐛 Fixed**\n\n- Fixes the shutdown hang.');
    });

    it('lists a package fix under its folder and package heading', () => {
        const fixed = {
            name: '@seedcord/utils',
            version: '0.8.12',
            oldVersion: '0.8.11',
            directory: 'packages/utils',
            changelog: lines(
                '# @seedcord/utils',
                '',
                '## 0.8.12',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed `renderTable`. ([#323](url))',
                ''
            )
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.10.03',
            published: [fixed],
            entries: new ReleaseEntries([fixed])
        }).body();

        expect(body).toContain(
            '## 📦 Packages\n\n### `@seedcord/utils`\n\n<sub>0.8.11 → 0.8.12</sub>\n\n**🐛 Fixed**\n\n- Fixed `renderTable`. ([#323](url))'
        );
    });

    it('orders packages by folder, then by name without the scope', () => {
        const entry = (name: string): string =>
            lines(`# ${name}`, '', '## 1.0.1', '', '### 🩹 Patch', '', `- Fixed ${name}.`, '');
        const unordered = [
            { name: '@seedcord/eslint-config', directory: 'tooling/eslint-config' },
            { name: '@seedcord/utils', directory: 'packages/utils' },
            { name: 'discord-component-embed', directory: 'packages/discord-component-embed' }
        ].map((pkg) => ({ ...pkg, version: '1.0.1', changelog: entry(pkg.name) }));

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.10.03',
            published: unordered,
            entries: new ReleaseEntries(unordered)
        }).body();

        const rows = body.split('\n').filter((line) => line.startsWith('| [`'));
        const headings = body.split('\n').filter((line) => line.startsWith('### '));
        const expected = ['discord-component-embed', '@seedcord/utils', '@seedcord/eslint-config'];

        expect(rows.map((row) => /`([^`]+)`/.exec(row)?.[1])).toEqual(expected);
        expect(headings).toEqual(expected.map((name) => `### \`${name}\``));
    });

    it('files a patch that fixes nothing under changed', () => {
        const reworded = {
            name: '@seedcord/logger',
            version: '0.4.4',
            directory: 'packages/logger',
            changelog: lines('# @seedcord/logger', '', '## 0.4.4', '', '### 🩹 Patch', '', '- Reworded the README.', '')
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.10.03',
            published: [reworded],
            entries: new ReleaseEntries([reworded])
        }).body();

        expect(body).toContain('**🔧 Changed**\n\n- Reworded the README.');
    });

    it('throws on a package in a folder with no section heading', () => {
        const unknown = {
            name: '@seedcord/vitest-config',
            version: '0.2.1',
            directory: 'configs/vitest-config',
            changelog: '# @seedcord/vitest-config\n'
        };

        expect(
            () =>
                new ReleaseNotes({
                    repo: 'seedcord/seedcord',
                    tag: 'release-2026.10.03',
                    published: [unknown],
                    entries: new ReleaseEntries([unknown])
                })
        ).toThrow(/configs/);
    });

    it('lists a change made in more than one package once, under the packages it touched', () => {
        const body = notes();

        expect(body).toContain(
            '### `@seedcord/core`\n\n<sub>0.6.0 → 0.7.0</sub>\n\n**💥 Breaking**\n\n- Renamed `routeId` to `origin`.'
        );
        expect(body).toContain(
            '## 👥 Shared changes\n\n#### ✨ Added `dispatchId` to every bus key. ([#311](url))\n\n`core` `gateway`'
        );
        expect(body.match(/Added `dispatchId`/g)).toHaveLength(1);
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

        expect(body).toContain('- Fixed `renderTable`. ([#323](url), thanks @alice and @bob)');
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

    it('keeps a link to a pull request in another repo', () => {
        const linked = {
            name: '@seedcord/gateway',
            version: '0.7.4',
            directory: 'packages/gateway',
            changelog: lines(
                '# @seedcord/gateway',
                '',
                '## 0.7.4',
                '',
                '### 🩹 Patch',
                '',
                '- Fixed a crash on discord.js 14.26 ([#11234](https://github.com/discordjs/discord.js/pull/11234)). ([#400](https://github.com/seedcord/seedcord/pull/400))',
                ''
            )
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.10.05',
            published: [linked],
            entries: new ReleaseEntries([linked])
        }).body();

        expect(body).toContain(
            'Fixed a crash on discord.js 14.26 ([#11234](https://github.com/discordjs/discord.js/pull/11234)). (#400)'
        );
    });

    it('turns a commit link that carries a short sha into the bare sha', () => {
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
                '- Fixed `wrapText`. ([`815fbb7`](https://github.com/seedcord/seedcord/commit/815fbb7))',
                ''
            )
        };

        const body = new ReleaseNotes({
            repo: 'seedcord/seedcord',
            tag: 'release-2026.09.09',
            published: [linked],
            entries: new ReleaseEntries([linked])
        }).body();

        expect(body).toContain('Fixed `wrapText`. (815fbb7)');
    });
});
