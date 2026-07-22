import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { RouteManifest } from '@src/manifest/RouteManifest';

export type { RouteManifest } from '@src/manifest/RouteManifest';

/**
 * The generated route table. `seedcord build` aliases this module to the emitted file. An un-built
 * import throws.
 */
export const manifest: RouteManifest = (() => {
    throw new SeedcordError(SeedcordErrorCode.ConfigManifestNotGenerated);
})();
