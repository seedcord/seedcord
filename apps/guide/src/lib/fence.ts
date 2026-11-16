import { removeTwoslashNotations } from 'twoslash/fallback';

import { dedent } from '#lib/dedent';

// the newline above a trailing marker is still there after removeTwoslashNotations
export function cleanFence(code: string): string {
    return dedent(removeTwoslashNotations(code).replace(/\n+$/, ''));
}
