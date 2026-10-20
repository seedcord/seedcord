import { LoadedConfig } from '#core/config/LoadedConfig';
import { ProjectFiles } from '#core/project/ProjectFiles';

import type { ResolvedSeedcordConfig } from '#core/config/schema';

// what ProjectLoader.readConfig hands back for a config built by hand
export function loadedConfig(config: ResolvedSeedcordConfig): LoadedConfig {
    return new LoadedConfig(config, new ProjectFiles(config));
}
