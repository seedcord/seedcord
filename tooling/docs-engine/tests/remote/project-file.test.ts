import { describe, expect, it } from 'vitest';

import { deserializeProject, serializeProject, validateProjectFile } from '#remote/project-file';

import { getMockPackage } from '../utils/test-helpers';

const FOLDER = 'https://github.com/seedcord/seedcord/blob/next/packages/core';

describe('a published project.json', () => {
    it('carries the readme, the changelog, and the folder the readme links resolve against', async () => {
        const model = await getMockPackage();
        const manifest = {
            ...model.manifest,
            readme: '# core',
            changelogUrl: `${FOLDER}/CHANGELOG.md`,
            folderUrl: FOLDER
        };

        const published = structuredClone(serializeProject({ ...model, manifest }));
        const loaded = deserializeProject(validateProjectFile(published));

        expect(loaded.manifest).toMatchObject({
            readme: '# core',
            changelogUrl: `${FOLDER}/CHANGELOG.md`,
            folderUrl: FOLDER
        });
    });
});
