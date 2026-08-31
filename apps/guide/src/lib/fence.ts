import { removeTwoslashNotations } from 'twoslash/fallback';

import { dedent } from '#lib/dedent';

// a trailing marker leaves the newline above it behind
export function cleanFence(code: string): string {
    return dedent(removeTwoslashNotations(code).replace(/\n+$/, ''));
}
