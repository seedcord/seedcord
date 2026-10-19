import { formatPostDate } from './summary';

import type { PostSummary } from './summary';

export const OG_PILL = 'blog';

export function ogMeta(post: Pick<PostSummary, 'created' | 'minutes'>): string[] {
    return [formatPostDate(post.created), `${post.minutes} min read`];
}
