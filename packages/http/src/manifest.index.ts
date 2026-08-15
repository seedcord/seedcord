import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { RouteManifest } from '#src/manifest/RouteManifest';

export type { RouteManifest } from '#src/manifest/RouteManifest';

const notGenerated = (): never => {
    throw new SeedcordError(SeedcordErrorCode.ConfigManifestNotGenerated);
};

/**
 * The generated route table. `seedcord build` aliases this module to the emitted file. Reading a route
 * list off the un-built stub will throw.
 */
export const manifest: RouteManifest = {
    get commandRoutes(): never {
        return notGenerated();
    },
    get componentRoutes(): never {
        return notGenerated();
    },
    get autocompleteRoutes(): never {
        return notGenerated();
    },
    get subscriberRoutes(): never {
        return notGenerated();
    },
    get middlewareRoutes(): never {
        return notGenerated();
    }
};
