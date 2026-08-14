import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

import { Envapter } from 'envapt';

const BINARY = 'cloudflared';
const DOWNLOADS = 'https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/';

export interface PathLookup {
    readonly pathVar: string | undefined;
    readonly pathExt: string | undefined;
    readonly platform: NodeJS.Platform;
    readonly delimiter: string;
    readonly exists: (candidate: string) => boolean;
}

export function systemLookup(): PathLookup {
    return {
        pathVar: Envapter.get('PATH'),
        pathExt: Envapter.get('PATHEXT'),
        platform: process.platform,
        delimiter,
        exists: existsSync
    };
}

export function findCloudflared(lookup: PathLookup): string | undefined {
    const suffixes = lookup.platform === 'win32' ? (lookup.pathExt?.split(';') ?? ['.EXE']) : [''];

    for (const dir of lookup.pathVar?.split(lookup.delimiter) ?? []) {
        for (const suffix of suffixes) {
            const candidate = join(dir, `${BINARY}${suffix}`);
            if (lookup.exists(candidate)) return candidate;
        }
    }

    return undefined;
}

export function installHint(platform: NodeJS.Platform): string {
    if (platform === 'darwin') return 'brew install cloudflared';
    if (platform === 'win32') return 'winget install -e --id Cloudflare.cloudflared';
    return DOWNLOADS;
}
