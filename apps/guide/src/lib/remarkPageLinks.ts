interface Node {
    type: string;
    url?: string;
    children?: Node[];
}

// trailingSlash in next.config.ts serves every page at its slashed url
function withTrailingSlash(url: string): string {
    if (!url.startsWith('/') || url.startsWith('//')) return url;

    const suffixAt = url.search(/[?#]/);
    const path = suffixAt === -1 ? url : url.slice(0, suffixAt);
    const isFile = path.slice(path.lastIndexOf('/')).includes('.');
    if (path.endsWith('/') || isFile) return url;

    return `${path}/${url.slice(path.length)}`;
}

function walk(tree: Node): void {
    for (const child of tree.children ?? []) {
        const carriesUrl = child.type === 'link' || child.type === 'definition';
        if (carriesUrl && child.url !== undefined) child.url = withTrailingSlash(child.url);
        walk(child);
    }
}

export function remarkPageLinks() {
    return (tree: Node): void => {
        walk(tree);
    };
}
