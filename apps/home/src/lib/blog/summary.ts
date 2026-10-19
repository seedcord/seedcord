import type { AuthorHandle } from './authors';
import type { BlogPost } from './source';

export interface PostAuthor {
    handle: AuthorHandle;
    name: string;
    url: string;
    github: string;
}

type Frontmatter = BlogPost['data'];

export interface PostSummary extends Pick<
    Frontmatter,
    'title' | 'description' | 'created' | 'edited' | 'cover' | 'unlisted'
> {
    slug: string;
    url: string;
    authors: PostAuthor[];
    minutes: number;
    editUrl: string;
}

export const postDate = (date: string): Date => new Date(`${date}T00:00:00Z`);

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const formatPostDate = (date: string): string => DATE.format(postDate(date));

const LIST = new Intl.ListFormat('en', { type: 'conjunction' });

export const joinList = (items: readonly string[]): string => LIST.format(items);

// the text after each item in a joined list, like ', ' and ', and '
export const listSeparators = (items: readonly string[]): string[] =>
    LIST.formatToParts(items).flatMap((part) => (part.type === 'literal' ? [part.value] : []));

// YYYY-MM-DD strings sort in date order
export const listedNewestFirst = (posts: readonly PostSummary[]): PostSummary[] =>
    posts.filter((post) => !post.unlisted).toSorted((a, b) => b.created.localeCompare(a.created));

export const lastChanged = (post: Pick<PostSummary, 'created' | 'edited'>): string => post.edited ?? post.created;

export const newestChange = (posts: readonly PostSummary[]): string | undefined =>
    posts.map(lastChanged).toSorted().at(-1);
