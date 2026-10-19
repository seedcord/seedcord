import { summarize } from './post';
import { listedPostsNewestFirst } from './source';

import type { PostSummary } from './post';

export async function listedPosts(): Promise<PostSummary[]> {
    return Promise.all(listedPostsNewestFirst().map(summarize));
}
