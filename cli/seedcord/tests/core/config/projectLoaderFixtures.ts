import { mkdirSync, mkdtempDisposableSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { onTestFinished } from 'vitest';

import { ProjectLoader } from '#core/config/ProjectLoader';
import { realPath } from '#core/project/realPath';
import { ShellMode } from '#src/core/ShellMode';
import { emptyModuleGraph } from '#tests/emptyModuleGraph';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { OpenModules } from '#core/modules/ModuleLoader';
import type { Project } from '#core/project/Project';

export const MINIMAL = { instance: './bot.ts', build: { start: './index.ts' } };

// openProjectWithSteps without the steps
export async function openProject(loader: ProjectLoader, projectDir: string): Promise<Project> {
    return loader.openProject(await loader.readConfig(projectDir));
}

export function tempProject(): string {
    const projectDir = mkdtempDisposableSync(join(tmpdir(), 'seedcord-config-'));
    onTestFinished(() => projectDir.remove());
    mkdirSync(join(projectDir.path, 'node_modules'));
    symlinkSync(
        join(import.meta.dirname, '../../../node_modules/envapt'),
        join(projectDir.path, 'node_modules/envapt'),
        'junction'
    );
    // tmpdir() sits under a symlink on mac and uses an 8.3 short name on the windows runner
    return realPath(projectDir.path);
}

export interface StubModules {
    open: OpenModules;
    // one row per loader the ProjectLoader opened, in order
    loaders: { loads: 'config' | 'bot'; closed: boolean }[];
}

export function stubModulesExporting(config: unknown): StubModules {
    const loaders: StubModules['loaders'] = [];
    const open: OpenModules = (_projectDir, _target, _mode, use) => {
        const loader: StubModules['loaders'][number] = { loads: use === 'config' ? 'config' : 'bot', closed: false };
        loaders.push(loader);
        return Promise.resolve({
            // justified: the only module a ProjectLoader imports through this stub is the config
            importModule: <TModule = unknown>(): Promise<TModule> => Promise.resolve({ default: config } as TModule),
            ...emptyModuleGraph,
            [Symbol.asyncDispose]: () => {
                loader.closed = true;
                return Promise.resolve();
            }
        });
    };

    return { open, loaders };
}

export function projectWith(config: unknown): { projectDir: string; load: () => Promise<ResolvedSeedcordConfig> } {
    const projectDir = tempProject();
    writeFileSync(join(projectDir, 'seedcord.config.ts'), '');
    const { open } = stubModulesExporting(config);

    const load = async (): Promise<ResolvedSeedcordConfig> => {
        await using loaded = await new ProjectLoader(open, new ShellMode()).readConfig(projectDir);
        return loaded.config;
    };

    return { projectDir, load };
}
