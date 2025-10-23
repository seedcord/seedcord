const slugifySegment = (segment: string): string => {
    const withoutGenerics = segment.replace(/<.*?>/g, '');
    const normalized = withoutGenerics
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    return normalized || 'item';
};

export class Slugger {
    private readonly seen = new Map<string, number>();
    private readonly prefix: string[];

    constructor(prefixSegments: string[] = []) {
        this.prefix = prefixSegments.map(slugifySegment);
    }

    slug(segments: string[]): string {
        return this.fromSegments(segments);
    }

    fromSegments(segments: string[]): string {
        const parts = [...this.prefix, ...segments.map(slugifySegment)];
        const base = parts.join('/');
        const count = this.seen.get(base) ?? 0;
        this.seen.set(base, count + 1);
        if (count === 0) {
            return base;
        }
        return `${base}-${count + 1}`;
    }

    withPrefix(...segments: string[]): Slugger {
        return new Slugger([...this.prefix, ...segments.map(slugifySegment)]);
    }
}

export const slugForNode = (slugger: Slugger, path: string[]): string => slugger.fromSegments(path);

export { slugifySegment };
