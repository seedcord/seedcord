import { formatPostDate, joinList, summarize } from './post';

import type { BlogPost } from './source';

export async function postMarkdown(page: BlogPost): Promise<string> {
    const post = await summarize(page);
    const authors = joinList(post.authors.map((author) => `[${author.name}](${author.url})`));
    const edited = post.edited === undefined ? '' : `, edited ${formatPostDate(post.edited)}`;
    const body = await page.data.getText('processed');

    return `# ${post.title}\n\n${post.description}\n\nBy ${authors} on ${formatPostDate(post.created)}${edited}.\n\n${body.replace(/^\n+/, '')}`;
}
