import type { Steps } from '#core/output/Steps';
import type { Project } from '#core/project/Project';
import type { ProjectLoader } from './ProjectLoader';
import type { ResolvedSeedcordConfig } from './schema';

export type OpenStep = 'read config' | 'load plugins';

export type ProjectOpener = Pick<ProjectLoader, 'readConfig' | 'openProject'>;

interface OpenOptions {
    projectDir?: string | undefined;
    // runs inside read config, before any plugin starts
    check?: ((config: ResolvedSeedcordConfig) => void) | undefined;
}

export async function openProjectWithSteps(
    steps: Steps<OpenStep>,
    loader: ProjectOpener,
    { projectDir, check }: OpenOptions = {}
): Promise<Project> {
    const read = await steps.step('read config', async () => {
        const config = await loader.readConfig(projectDir);
        check?.(config);
        if (config.vitePlugins.length > 0) return { config, project: undefined };
        return { config, project: await loader.openProject(config) };
    });
    return read.project ?? (await steps.step('load plugins', () => loader.openProject(read.config)));
}
