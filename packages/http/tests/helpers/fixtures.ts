import { Bus } from '@seedcord/core';

import type { HttpConfig } from '#interfaces/Config';
import type { Manifest } from '#src/manifest/Manifest';
import type { CoreBase } from '@seedcord/core';

export function stubBus(): Bus {
    // eslint-disable-next-line no-restricted-syntax -- fixture cast, the Bus only stores core and reads no member during publish
    return new Bus({} as unknown as CoreBase);
}

// the id every host decodes out of VALID_TOKEN
export const APP_ID = '1195232619718254663';

// eslint-disable-next-line no-magic-numbers -- mimic valid token shape
export const VALID_TOKEN = `${btoa(APP_ID).replaceAll('=', '')}.${'b'.repeat(6)}.${'c'.repeat(27)}`;

export const nullPathConfig: HttpConfig = {
    bot: { interactions: { path: null }, commands: { path: null } },
    subscribers: { path: null }
};

export function emptyManifest(): Manifest {
    return { handlers: [], middleware: [], subscribers: [] };
}

export function manifestWith(parts: Partial<Manifest>): Manifest {
    return { ...emptyManifest(), ...parts };
}
