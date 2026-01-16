import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { ProjectLoader } from '../src/ProjectLoader';
import { MOCK_PACKAGE_NAME, TEMP_DIR } from './utils/constants';
import { readRawProject } from './utils/test-helpers';

import type { JSONOutput, ProjectReflection } from 'typedoc';

let payload: JSONOutput.ProjectReflection;

const projectFilePath = path.resolve(TEMP_DIR, `${MOCK_PACKAGE_NAME}.json`);

describe('ProjectLoader', () => {
    beforeAll(async () => {
        payload = (await readRawProject()) as JSONOutput.ProjectReflection;
    });

    it('loads project reflection from file', async () => {
        const loader = new ProjectLoader();
        const project = await loader.fromFile(projectFilePath);
        expect(project.name).toBe(payload.name);
        expect(project.children?.length).toBeGreaterThan(0);
    });

    it('revives project reflection from object payload', () => {
        const loader = new ProjectLoader();
        const project: ProjectReflection = loader.fromObject(payload);
        expect(project.getChildByName('MockClass')).toBeTruthy();
        expect(project.getChildByName('mockFunction')).toBeTruthy();
    });
});
