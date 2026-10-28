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

// the edge worker sets chalk's color level after this module loads
export const token = (): string => paint.bold('DISCORD_BOT_TOKEN');

const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;

export function deployFix(status: number | undefined, otherwise: string): string {
    if (status === UNAUTHORIZED) return `Check that ${token()} is still valid.`;
    if (status === BAD_REQUEST) return "Check that each command's name, description and options are valid.";
    return otherwise;
}
