import { Bus } from '@seedcord/core';

import type { RouteManifest } from '#src/manifest/RouteManifest';
import type { CoreBase } from '@seedcord/core';
import type { Config } from '@seedcord/types';

export function stubBus(): Bus {
    // eslint-disable-next-line no-restricted-syntax -- fixture cast, the Bus only stores core and reads no member during publish
    return new Bus({} as unknown as CoreBase);
}

// eslint-disable-next-line no-magic-numbers -- mimic valid token shape
export const VALID_TOKEN = `${'a'.repeat(24)}.${'b'.repeat(6)}.${'c'.repeat(27)}`;

export const nullPathConfig: Config = {
    bot: { interactions: { path: null }, commands: { path: null } },
    subscribers: { path: null }
};

export function emptyManifest(): RouteManifest {
    return {
        commandRoutes: [],
        componentRoutes: [],
        autocompleteRoutes: [],
        subscriberRoutes: [],
        middlewareRoutes: []
    };
}
