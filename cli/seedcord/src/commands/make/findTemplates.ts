import { dirname, join } from 'node:path';

import { Template } from '@seedcord/cli-templates';
import { isPlainObject, posixRelative } from '@seedcord/utils/internal';

import { readManifest } from '#core/modules/installedManifest';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { InstalledDependencies } from '#core/modules/installedManifest';

interface TemplateSource {
    readonly dir: string;
    readonly from: string;
}

// a plugin lists its templates folder as "seedcord": { "templates": "./templates" } in its package.json
function pluginSources(dependencies: InstalledDependencies): TemplateSource[] {
    return [...dependencies].flatMap(([name, manifestPath]) => {
        const seedcord = readManifest(manifestPath)?.seedcord;
        if (!isPlainObject(seedcord) || typeof seedcord.templates !== 'string') return [];
        return [{ dir: join(dirname(manifestPath), seedcord.templates), from: name }];
    });
}

export async function findTemplates(
    config: ResolvedSeedcordConfig,
    dependencies: InstalledDependencies
): Promise<Template[]> {
    const sources = [
        { dir: config.make.templates, from: `${posixRelative(dirname(config.configFile), config.make.templates)}/` },
        ...pluginSources(dependencies)
    ];
    const found = await Promise.all(sources.map(({ dir, from }) => Template.readAll(dir, from)));
    return found.flat();
}
