const ROOT = 'index';

const toSegments = (path: string): string[] => path.split('/').filter(Boolean);

export class PageAsset {
    constructor(
        public readonly extension: string,
        // next's export fails with EISDIR on a route that is both a file and a folder
        public readonly directory: string
    ) {}

    static forPath(pathname: string): PageAsset | undefined {
        return PAGE_ASSETS.find((asset) => pathname.endsWith(asset.extension));
    }

    fileSegments(pageSegments: readonly string[]): string[] {
        const last = pageSegments.at(-1) ?? ROOT;
        return [...pageSegments.slice(0, -1), `${last}${this.extension}`];
    }

    pageSegments(fileSegments: readonly string[]): string[] | undefined {
        const last = fileSegments.at(-1);
        if (last?.endsWith(this.extension) !== true) return undefined;

        const name = last.slice(0, -this.extension.length);
        const folders = fileSegments.slice(0, -1);
        return folders.length === 0 && name === ROOT ? [] : [...folders, name];
    }

    publicPath(pagePath: string): string {
        const page = pagePath.endsWith(this.extension) ? pagePath.slice(0, -this.extension.length) : pagePath;
        return `/${this.fileSegments(toSegments(page)).join('/')}`;
    }

    exportPath(pagePath: string): string {
        return `/${this.directory}${this.publicPath(pagePath)}`;
    }
}

// the directories match the llms and og route folders in each site
export const TWIN = new PageAsset('.md', 'llms');
export const CARD = new PageAsset('.png', 'og');

const PAGE_ASSETS = [TWIN, CARD];
