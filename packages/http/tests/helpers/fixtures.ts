import type { Config } from '@seedcord/types';
import type { RouteManifest } from '@src/manifest/RouteManifest';

export const VALID_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAA.BBBBBB.CCCCCCCCCCCCCCCCCCCCCCCCCCC';

export const nullPathConfig: Config = {
    bot: { interactions: { path: null }, commands: { path: null } },
    subscribers: { path: null }
};

export function emptyManifest(): RouteManifest {
    return { commands: [], components: [], autocomplete: [], subscribers: [] };
}
