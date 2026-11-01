// trailingSlash in next.config.ts serves every page at its slashed url
export function withTrailingSlash(url: string): string {
    if (!url.startsWith('/') || url.startsWith('//')) return url;

    const suffixAt = url.search(/[?#]/);
    const path = suffixAt === -1 ? url : url.slice(0, suffixAt);
    const isFile = path.slice(path.lastIndexOf('/')).includes('.');
    if (path.endsWith('/') || isFile) return url;

    return `${path}/${url.slice(path.length)}`;
}
