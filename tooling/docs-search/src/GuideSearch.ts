import { GUIDE_ASK_PATH } from '#src/files';
import { guideResult } from '#src/GuideResult';
import { readJson } from '#src/readAsset';
import { isAskWaitStatus, SearchUnavailable } from '#src/SearchUnavailable';

import type { GuideResult } from '#src/GuideResult';
import type { GuideHit } from '#src/guideSections';
import type { Question } from '#src/question';
import type { SiteAddress } from '@seedcord/brand';

async function fetchAnswer(url: string, signal: AbortSignal): Promise<Response> {
    const response = await fetch(url, { signal });
    // retry-after may also hold an HTTP date
    const retryAfter = Number(response.headers.get('retry-after'));
    if (isAskWaitStatus(response.status) && Number.isSafeInteger(retryAfter) && retryAfter > 0) {
        throw new SearchUnavailable(response.status, retryAfter);
    }
    return response;
}

export class GuideSearch {
    constructor(private readonly site: SiteAddress) {}

    async search(question: Question, signal: AbortSignal): Promise<GuideResult[]> {
        const url = new URL(this.site.at(GUIDE_ASK_PATH));
        url.searchParams.set('q', question);
        const hits = await readJson<GuideHit[]>(url.href, (path) => fetchAnswer(path, signal));
        return hits.map((hit) => guideResult(hit, { by: 'meaning' }, this.site));
    }
}
