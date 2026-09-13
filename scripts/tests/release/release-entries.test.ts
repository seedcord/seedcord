import { describe, expect, it } from 'vitest';

import { ReleaseEntries } from '#src/release/ReleaseEntries';

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
    '- `interactionDispatched` now carries `userId`. ([#310](url))',
    '',
    '### 🩹 Patch',
    '',
    '#### 📦 Seedcord packages',
    '',
    '- `@seedcord/types` 0.12.0 → 0.13.0',
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

describe('ReleaseEntries', () => {
    it('groups a package entry under its bucket', () => {
        const entries = new ReleaseEntries([{ name: '@seedcord/core', version: '0.7.0', changelog: CORE }]);

        expect(entries.breaking).toEqual([
            { summary: 'Renamed `routeId` to `origin`. ([#311](url))', packages: ['core'] }
        ]);
        expect(entries.minor).toHaveLength(2);
    });

    it('names every package sharing one summary', () => {
        const entries = new ReleaseEntries([
            { name: '@seedcord/core', version: '0.7.0', changelog: CORE },
            { name: '@seedcord/gateway', version: '0.6.0', changelog: GATEWAY }
        ]);

        expect(entries.minor[0]).toEqual({
            summary: 'Added `dispatchId` to every bus key. ([#311](url))',
            packages: ['core', 'gateway']
        });
        expect(entries.minor).toHaveLength(2);
    });

    it('files a summary shared across headings once, under the highest one', () => {
        const http = lines(
            '# @seedcord/http',
            '',
            '## 0.8.1',
            '',
            '### 🩹 Patch',
            '',
            '- Added `dispatchId` to every bus key. ([#311](url))',
            ''
        );

        const entries = new ReleaseEntries([
            { name: '@seedcord/http', version: '0.8.1', changelog: http },
            { name: '@seedcord/gateway', version: '0.6.0', changelog: GATEWAY }
        ]);

        expect(entries.minor).toEqual([
            { summary: 'Added `dispatchId` to every bus key. ([#311](url))', packages: ['http', 'gateway'] }
        ]);
        expect(entries.patch).toEqual([]);
    });

    it('keeps a shared summary under the higher heading when the lower one arrives second', () => {
        const http = lines(
            '# @seedcord/http',
            '',
            '## 0.8.1',
            '',
            '### 🩹 Patch',
            '',
            '- Added `dispatchId` to every bus key. ([#311](url))',
            ''
        );

        const entries = new ReleaseEntries([
            { name: '@seedcord/gateway', version: '0.6.0', changelog: GATEWAY },
            { name: '@seedcord/http', version: '0.8.1', changelog: http }
        ]);

        expect(entries.minor).toEqual([
            { summary: 'Added `dispatchId` to every bus key. ([#311](url))', packages: ['gateway', 'http'] }
        ]);
        expect(entries.patch).toEqual([]);
    });

    it('leaves the seedcord package block out of the entries', () => {
        const entries = new ReleaseEntries([{ name: '@seedcord/core', version: '0.7.0', changelog: CORE }]);

        expect(entries.patch).toEqual([]);
    });

    it('reads nothing from a version the changelog lacks', () => {
        const entries = new ReleaseEntries([{ name: '@seedcord/core', version: '9.9.9', changelog: CORE }]);

        expect(entries.breaking).toEqual([]);
        expect(entries.minor).toEqual([]);
    });

    it('lists the packages that only moved through their dependencies', () => {
        const entries = new ReleaseEntries([
            { name: '@seedcord/core', version: '0.7.0', changelog: CORE },
            { name: '@seedcord/utils', version: '0.8.11', changelog: lines('# @seedcord/utils', '') }
        ]);

        expect(entries.dependencyOnly).toEqual(['@seedcord/utils']);
    });
});
