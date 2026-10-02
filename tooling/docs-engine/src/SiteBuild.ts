const ROOT = 'builds/';
// timestamp first to make a plain string sort chronological
const ID = /^\d{8}T\d{6}Z-[\da-f]{7,40}$/;

// one render of the docs site, in its own folder of the docs bucket
export class SiteBuild {
    static readonly ROOT = ROOT;

    constructor(public readonly id: string) {
        if (!ID.test(id)) {
            throw new RangeError(`site build id "${id}" must look like 20261002T051234Z-<commit sha>`);
        }
    }

    static at(time: Date, sha: string): SiteBuild {
        const stamp = time
            .toISOString()
            .replaceAll(/[-:]/g, '')
            .replace(/\.\d{3}/, '');
        return new SiteBuild(`${stamp}-${sha}`);
    }

    static fromFolder(folder: string): SiteBuild | undefined {
        const id = folder.startsWith(ROOT) ? folder.slice(ROOT.length).replace(/\/$/, '') : '';
        return ID.test(id) ? new SiteBuild(id) : undefined;
    }

    get folder(): string {
        return `${ROOT}${this.id}/`;
    }

    key(path: string): string {
        return `${this.folder}${path}`;
    }

    isOlderThan(other: SiteBuild): boolean {
        return this.id < other.id;
    }
}
