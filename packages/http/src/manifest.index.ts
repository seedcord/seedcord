import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { Manifest } from '#src/manifest/Manifest';

export type { Manifest } from '#src/manifest/Manifest';

const notGenerated = (): never => {
    throw new SeedcordError(SeedcordErrorCode.ConfigManifestNotGenerated);
};

/**
 * The generated class list. `seedcord build` aliases this module to the emitted file. Reading a class
 * list off the un-built stub throws.
 */
export const manifest: Manifest = {
    get handlers(): never {
        return notGenerated();
    },
    get middleware(): never {
        return notGenerated();
    },
    get subscribers(): never {
        return notGenerated();
    }
};
