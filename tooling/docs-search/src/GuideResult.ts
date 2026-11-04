import type { GuideHit } from '#src/guideSections';
import type { SiteAddress } from '@seedcord/brand';

type FoundBy =
    | { by: 'title'; terms: readonly string[] }
    | { by: 'text'; excerpt: string; terms: readonly [string] }
    | { by: 'meaning'; excerpt?: string };

export type GuideResult = GuideHit & { url: string } & FoundBy;

export const guideResult = (hit: GuideHit, found: FoundBy, site: SiteAddress): GuideResult => ({
    ...hit,
    url: site.at(hit.path),
    ...found
});
