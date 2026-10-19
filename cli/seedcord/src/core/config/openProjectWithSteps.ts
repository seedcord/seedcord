import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { ProjectLoader, ProjectCheck } from './ProjectLoader';

type OpenStep = 'read config' | 'load plugins';

export type ProjectOpener = Pick<ProjectLoader, 'readConfig' | 'openProject'>;

interface OpenOptions {
    projectDir?: string | undefined;
    check?: ProjectCheck | undefined;
}

export async function openProjectWithSteps(
    steps: Steps<OpenStep>,
    loader: ProjectOpener,
    { projectDir, check }: OpenOptions = {}
): Promise<Project> {
    const read = await steps.step('read config', async () => {
        const loaded = await loader.readConfig(projectDir, check);
        if (loaded.hasVitePlugins) return { loaded, project: undefined };
        return { loaded, project: await loader.openProject(loaded) };
    });
    return read.project ?? (await steps.step('load plugins', () => loader.openProject(read.loaded)));
}
