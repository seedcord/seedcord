import type { Config } from '@seedcord/types';
import type { RouteManifest } from '@src/manifest/RouteManifest';

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
