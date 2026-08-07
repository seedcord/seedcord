import { formatDisplayPackageName } from '@packages/identity';
import { resolveEntityTone, resolveEntityToneStrict, toneToDirectory, type EntityTone } from '@src/tones';

export interface BuildEntityHrefOptions {
    name: string;
    slug: string;
    version?: string | null;
    tone?: string | null;
}

const DEFAULT_VERSION_SEGMENT = 'latest';

const encodeSegment = (segment: string): string => encodeURIComponent(segment);

export function buildEntityHref({ name, slug, version, tone }: BuildEntityHrefOptions): string {
    const resolvedTone = tone ? resolveEntityTone(tone) : null;
    const packageSegment = encodeSegment(formatDisplayPackageName(name));
    const versionSegment = encodeSegment(version ?? DEFAULT_VERSION_SEGMENT);
    const segments: string[] = ['', 'packages', packageSegment, versionSegment];

    if (resolvedTone) {
        segments.push(toneToDirectory(resolvedTone));
    }

    segments.push(encodeSegment(slug));

    return segments.join('/');
}

export function buildPackageBasePath(manifestPackage: string, version: string | null | undefined): string {
    const packageSegment = encodeSegment(formatDisplayPackageName(manifestPackage));
    const versionSegment = encodeSegment(version ?? DEFAULT_VERSION_SEGMENT);

    return `/packages/${packageSegment}/${versionSegment}`;
}

export interface ParsedEntityPath {
    tone: EntityTone | null;
    slug: string | null;
    rawSegments: string[];
}

export function parseEntityPathSegments(segments?: string[] | null): ParsedEntityPath {
    if (!segments?.length) {
        return {
            tone: null,
            slug: null,
            rawSegments: []
        } satisfies ParsedEntityPath;
    }

    const [first, ...rest] = segments;
    // The leading segment becomes the tone only when it names an entity tone (the plural directory
    // buildEntityHref emits, or a singular/synonym form). A non-tone, non-empty leading segment stays
    // in the slug. Unlike resolveEntityTone, resolveEntityToneStrict returns null for it. An empty
    // leading segment is dropped.
    const tone = first ? resolveEntityToneStrict(first) : null;
    const slugSegments = tone || !first ? rest : segments;

    if (slugSegments.length === 0) {
        return {
            tone,
            slug: null,
            rawSegments: segments
        } satisfies ParsedEntityPath;
    }

    const slug = decodeURIComponent(slugSegments.join('/'));

    return {
        tone,
        slug,
        rawSegments: segments
    } satisfies ParsedEntityPath;
}
