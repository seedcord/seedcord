const ROOT = 'index';

// next's export fails with EISDIR on a route that is both a file and a folder
class PageAsset {
    constructor(
        public readonly extension: string,
        public readonly directory: string
    ) {}

    assetSegments(pageSegments: readonly string[]): string[] {
        const last = pageSegments.at(-1) ?? ROOT;
        return [...pageSegments.slice(0, -1), `${last}${this.extension}`];
    }

    assetPath(pagePath: string): string {
        return `/${this.assetSegments(pagePath.split('/').filter(Boolean)).join('/')}`;
    }

    pageSegments(assetSegments: readonly string[]): string[] | undefined {
        const last = assetSegments.at(-1);
        if (last?.endsWith(this.extension) !== true) return undefined;

        const name = last.slice(0, -this.extension.length);
        const folders = assetSegments.slice(0, -1);
        return folders.length === 0 && name === ROOT ? [] : [...folders, name];
    }
}

// the directories match the app/llms and app/og route folders
export const TWIN = new PageAsset('.md', 'llms');
export const CARD = new PageAsset('.png', 'og');
