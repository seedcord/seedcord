const START_TAB = 'start';
const SITE_PILL = 'guide';

export interface PillPage {
    slugs: readonly string[];
    path: string;
}

// every tab except Start is a folder under content/docs
export function pillFor({ slugs, path }: PillPage): string {
    if (slugs.length === 0) return SITE_PILL;

    const [folder, ...rest] = path.split('/');
    return rest.length > 0 && folder !== undefined ? folder : START_TAB;
}
