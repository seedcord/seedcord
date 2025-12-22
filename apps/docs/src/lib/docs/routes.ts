import { resolveEntityTone, toneToDirectory, type EntityTone } from '@lib/entityMetadata';

import { formatDisplayPackageName } from './packages';

import type { BuildEntityHrefOptions } from './types';
import type { Route } from 'next';

export const DEFAULT_VERSION_SEGMENT = 'latest';

const encodeSegment = (segment: string): string => encodeURIComponent(segment);

export const buildEntityHref = ({ name, slug, version, tone }: BuildEntityHrefOptions): Route => {
    const resolvedTone = tone ? resolveEntityTone(tone) : null;
    const packageSegment = encodeSegment(formatDisplayPackageName(name));
    const versionSegment = encodeSegment(version ?? DEFAULT_VERSION_SEGMENT);
    const segments: string[] = ['', 'docs', 'packages', packageSegment, versionSegment];

    if (resolvedTone) {
        segments.push(toneToDirectory(resolvedTone));
    }

    segments.push(encodeSegment(slug));

    return segments.join('/') as Route;
};

export const buildPackageBasePath = (manifestPackage: string, version: string | null | undefined): Route => {
    const packageSegment = encodeSegment(formatDisplayPackageName(manifestPackage));
    const versionSegment = encodeSegment(version ?? DEFAULT_VERSION_SEGMENT);

    return `/docs/packages/${packageSegment}/${versionSegment}` as Route;
};

export interface ParsedEntityPath {
    tone: EntityTone | null;
    slug: string | null;
    rawSegments: string[];
}

export const parseEntityPathSegments = (segments?: string[] | null): ParsedEntityPath => {
    if (!segments?.length) {
        return {
            tone: null,
            slug: null,
            rawSegments: []
        } satisfies ParsedEntityPath;
    }

    const [maybeTone, ...rest] = segments;
    const tone = maybeTone ? resolveEntityTone(maybeTone) : null;

    if (!rest.length) {
        return {
            tone,
            slug: null,
            rawSegments: segments
        } satisfies ParsedEntityPath;
    }

    const slug = decodeURIComponent(rest.join('/'));

    return {
        tone,
        slug,
        rawSegments: segments
    } satisfies ParsedEntityPath;
};

export const getEntityRouteSegment = (tone: EntityTone): string => toneToDirectory(tone);
