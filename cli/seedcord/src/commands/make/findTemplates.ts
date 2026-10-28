import { dirname } from 'node:path';

import { Template } from '@seedcord/cli-templates';
import { posixRelative } from '@seedcord/utils/internal';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { PackageManifest } from '#core/modules/PackageManifest';

export async function findTemplates(
    config: ResolvedSeedcordConfig,
    dependencies: ReadonlyMap<string, PackageManifest>
): Promise<Template[]> {
    const plugins = [...dependencies].flatMap(([name, manifest]) => {
        const dir = manifest.templatesFolder;
        return dir === undefined ? [] : [{ dir, from: name }];
    });
    const sources = [
        { dir: config.make.templates, from: `${posixRelative(dirname(config.configFile), config.make.templates)}/` },
        ...plugins
    ];
    const found = await Promise.all(sources.map(({ dir, from }) => Template.readAll(dir, from)));
    return found.flat();
}
