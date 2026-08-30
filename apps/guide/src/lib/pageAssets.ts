export interface PageAsset {
    extension: string;
    directory: string;
}

/** MD twin of the page */
export const TWIN: PageAsset = { extension: '.md', directory: '/llms' };

/** Social card for the page */
export const CARD: PageAsset = { extension: '.png', directory: '/og' };

const ASSETS = [TWIN, CARD];
const ROOT = 'index';

// a static export names the file after the route
export function assetSegments(slugs: readonly string[], { extension }: PageAsset): string[] {
    const last = slugs.at(-1) ?? ROOT;
    return [...slugs.slice(0, -1), `${last}${extension}`];
}

export function slugsFromAsset(segments: readonly string[], { extension }: PageAsset): string[] | undefined {
    const last = segments.at(-1);
    if (last === undefined || !last.endsWith(extension)) return undefined;

    const name = last.slice(0, -extension.length);
    const folders = segments.slice(0, -1);
    if (folders.length === 0 && name === ROOT) return [];
    return [...folders, name];
}

function tail(pathname: string, asset: PageAsset): string {
    const bare = pathname.endsWith(asset.extension) ? pathname.slice(0, -asset.extension.length) : pathname;
    return assetSegments(bare.split('/').filter(Boolean), asset).join('/');
}

// where the export wrote it, /llms/commands/options.md or /og/commands/options.png
export function assetPath(pathname: string, asset: PageAsset): string {
    return `${asset.directory}/${tail(pathname, asset)}`;
}

// worker.ts rewrites this url onto the path above
export function publicPath(pathname: string, asset: PageAsset): string {
    return `/${tail(pathname, asset)}`;
}

// undefined for a url naming neither
export function generatedPathFor(pathname: string): string | undefined {
    const asset = ASSETS.find((candidate) => pathname.endsWith(candidate.extension));
    return asset === undefined ? undefined : assetPath(pathname, asset);
}
