import { describe, expect, it } from 'vitest';

import { artifactKeys, isArtifactKey, versionDir } from '#src/docs/artifact-keys';

describe('versionDir', () => {
    it('files a stable version under releases', () => {
        expect(versionDir('core', '0.7.0')).toBe('packages/core/releases/0.7.0');
    });

    it('files a prerelease under prerelease', () => {
        expect(versionDir('core', '0.8.0-next.1')).toBe('packages/core/prerelease/0.8.0-next.1');
    });
});

describe('artifactKeys', () => {
    it('lists both files for every version, plus the index', () => {
        const keys = artifactKeys([{ folder: 'core', versions: ['0.7.0', '0.8.0-next.1'] }]);

        expect([...keys].sort()).toEqual([
            'index.json',
            'packages/core/prerelease/0.8.0-next.1/api.json',
            'packages/core/prerelease/0.8.0-next.1/project.json',
            'packages/core/releases/0.7.0/api.json',
            'packages/core/releases/0.7.0/project.json'
        ]);
    });

    it('lists the index alone when no package has a version', () => {
        expect([...artifactKeys([])]).toEqual(['index.json']);
    });
});

describe('isArtifactKey', () => {
    it('accepts the index and the two files a version dir holds', () => {
        expect(isArtifactKey('index.json')).toBe(true);
        expect(isArtifactKey('packages/core/releases/0.7.0/project.json')).toBe(true);
        expect(isArtifactKey('packages/core/releases/0.7.0/api.json')).toBe(true);
    });

    it('rejects anything else stored beside them', () => {
        expect(isArtifactKey('packages/core/releases/0.7.0/readme.md')).toBe(false);
        expect(isArtifactKey('notes.txt')).toBe(false);
    });
});
