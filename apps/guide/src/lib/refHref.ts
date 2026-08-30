import { slugifySegment } from '@seedcord/docs-engine/client';

import { DOCS_URL } from '#lib/site';

// the reference site anchors a member on its owner's page, in AnchorStrategy.buildMemberHref
export function refHref(pkg: string, symbol: string): string {
    const [owner, ...members] = (symbol.match(/[^.#]+/g) ?? []).map(slugifySegment);
    const anchor = members.at(-1);
    const page = `${DOCS_URL}/packages/${pkg}/latest`;

    if (owner === undefined) return page;
    return `${page}/${owner}${anchor ? `#${anchor}` : ''}`;
}
