import { GUIDE } from '@seedcord/ui/sites';

import type { GuideHit } from '#src/guideSections';

type FoundBy =
    | { by: 'title'; terms: readonly string[] }
    | { by: 'text'; excerpt: string; terms: readonly [string] }
    | { by: 'meaning' };

export type GuideResult = GuideHit & { url: string } & FoundBy;

export const guideResult = (hit: GuideHit, found: FoundBy): GuideResult => ({
    ...hit,
    url: GUIDE.at(hit.path),
    ...found
});
