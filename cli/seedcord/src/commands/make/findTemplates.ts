import { dirname, join } from 'node:path';

import { Template } from '@seedcord/cli-templates';
import { isPlainObject, posixRelative } from '@seedcord/utils/internal';

import { directDependencies, readManifest } from '#core/modules/installedManifest';

import type { ResolvedSeedcordConfig } from '#core/config/schema';

interface TemplateSource {
    readonly dir: string;
    readonly from: string;
}

// a plugin lists its templates folder as "seedcord": { "templates": "./templates" } in its package.json
function pluginSources(projectDir: string): TemplateSource[] {
    return [...directDependencies(projectDir)].flatMap(([name, manifestPath]) => {
        const seedcord = readManifest(manifestPath)?.seedcord;
        if (!isPlainObject(seedcord) || typeof seedcord.templates !== 'string') return [];
        return [{ dir: join(dirname(manifestPath), seedcord.templates), from: name }];
    });
}

export async function findTemplates(config: ResolvedSeedcordConfig): Promise<Template[]> {
    const configDir = dirname(config.configFile);
    const sources = [
        { dir: config.make.templates, from: `${posixRelative(configDir, config.make.templates)}/` },
        ...pluginSources(configDir)
    ];
    const found = await Promise.all(sources.map(({ dir, from }) => Template.readAll(dir, from)));
    return found.flat();
}
