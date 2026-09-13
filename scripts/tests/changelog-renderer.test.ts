import { describe, expect, it } from 'vitest';

import { ChangelogRenderer } from '#src/release/ChangelogRenderer';

const SUBJECTS = new Map([
    ['359748d', 'feat: middleware rework (#310)'],
    ['0988f67', 'feat: export the custom-id helpers'],
    ['d4b9108', 'feat: consistent dispatch identity (#311)'],
    ['aaa1111', 'fix: a thing (#312)'],
    ['bbb2222', 'feat: another thing (#313)']
]);

const CONTRIBUTORS = new Map([
    ['310', ['alice', 'bob']],
    ['311', ['materwelonDhruv']],
    ['312', ['cara']],
    ['313', ['alice', 'bob', 'cara']]
]);

const renderer = new ChangelogRenderer({
    repo: 'seedcord/seedcord',
    subjectOf: (sha) => Promise.resolve(SUBJECTS.get(sha))
});

describe('ChangelogRenderer release line', () => {
    it('links the pull request the commit subject names', async () => {
        const line = await renderer.releaseLine({
            summary: '`interactionDispatched` now carries `userId` and `guildId`.',
            commit: '359748d'
        });

        expect(line).toBe(
            '- `interactionDispatched` now carries `userId` and `guildId`. ([#310](https://github.com/seedcord/seedcord/pull/310))'
        );
    });

    it('links the commit when its subject names no pull request', async () => {
        const line = await renderer.releaseLine({
            summary: 'The transport packages now export `prefixOf`.',
            commit: '0988f67'
        });

        expect(line).toBe(
            '- The transport packages now export `prefixOf`. ([`0988f67`](https://github.com/seedcord/seedcord/commit/0988f67))'
        );
    });

    it('leaves an uncommitted changeset without a link', async () => {
        expect(await renderer.releaseLine({ summary: 'A thing changed.' })).toBe('- A thing changed.');
    });
});

describe('ChangelogRenderer contributor credit', () => {
    const crediting = new ChangelogRenderer({
        repo: 'seedcord/seedcord',
        subjectOf: (sha) => Promise.resolve(SUBJECTS.get(sha)),
        contributorsOf: (pull) => Promise.resolve(CONTRIBUTORS.get(pull) ?? []),
        maintainers: ['materwelonDhruv']
    });

    it('names one contributor', async () => {
        const line = await crediting.releaseLine({ summary: 'A thing changed.', commit: 'aaa1111' });

        expect(line).toBe(
            '- A thing changed. ([#312](https://github.com/seedcord/seedcord/pull/312), thanks [@cara](https://github.com/cara))'
        );
    });

    it('joins two contributors with and', async () => {
        const line = await crediting.releaseLine({ summary: 'A thing changed.', commit: '359748d' });

        expect(line).toBe(
            '- A thing changed. ([#310](https://github.com/seedcord/seedcord/pull/310), thanks [@alice](https://github.com/alice) and [@bob](https://github.com/bob))'
        );
    });

    it('joins three contributors with commas and a final and', async () => {
        const line = await crediting.releaseLine({ summary: 'A thing changed.', commit: 'bbb2222' });

        expect(line).toBe(
            '- A thing changed. ([#313](https://github.com/seedcord/seedcord/pull/313), thanks [@alice](https://github.com/alice), [@bob](https://github.com/bob) and [@cara](https://github.com/cara))'
        );
    });

    it('credits nobody when the maintainer wrote it alone', async () => {
        const line = await crediting.releaseLine({ summary: 'A thing changed.', commit: 'd4b9108' });

        expect(line).toBe('- A thing changed. ([#311](https://github.com/seedcord/seedcord/pull/311))');
    });
});

describe('ChangelogRenderer dependency block', () => {
    it('lists each updated dependency with its old and new version', () => {
        const block = renderer.dependencyLine([
            { name: '@seedcord/types', oldVersion: '0.12.0', newVersion: '0.13.0' },
            { name: '@seedcord/errors', oldVersion: '0.7.0', newVersion: '0.8.0' }
        ]);

        expect(block).toBe('- `@seedcord/types` 0.12.0 → 0.13.0\n- `@seedcord/errors` 0.7.0 → 0.8.0');
    });

    it('writes nothing when no dependency moved', () => {
        expect(renderer.dependencyLine([])).toBe('');
    });
});
