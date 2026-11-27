import { BOT_TOKEN_ENV } from './botTokenKeys';
import { paint } from './palette';

export interface VitePluginPlace {
    hook?: string | undefined;
    // only load and transform run on a module
    loading?: { kind: 'file'; path: string } | { kind: 'virtual'; id: string } | undefined;
}

export function placeText(hook: string, loading: VitePluginPlace['loading']): string {
    const inHook = `in its ${paint.bold(hook)} hook`;
    if (loading === undefined) return inHook;
    const shown = loading.kind === 'file' ? paint.path(loading.path) : paint.bold(loading.id);
    return `${inHook} while loading ${shown}`;
}

export function vitePluginFix({ loading }: VitePluginPlace): string {
    if (loading?.kind !== 'file') return 'Check the options you pass the plugin.';
    return `Fix ${paint.path(loading.path)}, or check the options you pass the plugin if that file looks right.`;
}

export const listedFolderProblems = {
    missing: `which does not exist. Create it, or take it out of ${paint.bold('files')}.`,
    file: `which is a file. ${paint.bold('files')} takes folders. List the folder that holds it.`,
    outsideProject: `which is outside the folder that holds seedcord.config.ts. Move it into that folder and list its new path.`
};

export const clientDirProblems = {
    outside: 'which is outside the folder that holds seedcord.config.ts.',
    configFolder: 'which is the folder that holds seedcord.config.ts.',
    holdsRoot: `which holds your bot's ${paint.bold('root')}. It can't hold your bot's code because browsers can load every file in it.`
};

export const emojiFileProblems = {
    name: 'Discord takes a name of 2 to 32 letters, digits, and underscores. Rename the file.',
    format: 'Discord takes a PNG, JPEG, GIF, APNG, WebP, or AVIF file. Convert this one, or move it out of the emojis folder.',
    size: 'Discord rejects a file over 2048 KiB. Export it as a 128px WebP, animated if it moves.'
};

export type LoginNeededReason = 'never' | 'refused' | { missingScope: string };

export function loginNeededBecause(why: LoginNeededReason): string {
    if (why === 'never') {
        return "They don't have saved tokens here. They never logged in, they were logged out, or the client secret changed since they logged in.";
    }
    if (why === 'refused') return 'Discord refused their saved tokens, which happens after they remove the app.';
    return `Their login is from before ${paint.bold(why.missingScope)} was in ${paint.bold('scopes')}.`;
}

// the edge worker sets chalk's color level after this module loads
export const token = (): string => paint.bold(BOT_TOKEN_ENV);

const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;

export function deployFix(status: number | undefined, otherwise: string): string {
    if (status === UNAUTHORIZED) return `Check that ${token()} is still valid.`;
    if (status === BAD_REQUEST) return "Check that each command's name, description and options are valid.";
    return otherwise;
}
