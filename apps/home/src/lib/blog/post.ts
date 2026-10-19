import path from 'node:path';

import { readingMinutes } from '@seedcord/ui/readingTime';

import { REPO_URL } from '#lib/site';

import { AUTHORS } from './authors';

import type { Author, AuthorHandle } from './authors';
import type { BlogPost } from './source';

export interface PostAuthor {
    handle: AuthorHandle;
    name: string;
    url: string;
    github: string;
    avatar: string;
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

const GITHUB = 'https://github.com';
// pull requests merge into next
const CONTENT_SOURCE = `${REPO_URL}/edit/next/apps/home/content/blog`;

function authorsOf(post: BlogPost): PostAuthor[] {
    return post.data.authors.map((handle) => {
        const author: Author = AUTHORS[handle];
        const github = `${GITHUB}/${handle}`;
        return { handle, name: author.name, url: author.site ?? github, github, avatar: `${github}.png?size=96` };
    });
}

export function slugOf(post: BlogPost): string {
    const [slug] = post.slugs;
    if (slug === undefined) throw new Error(`${post.path} is at the root of content/blog. Put it in its own folder.`);
    return slug;
}

// fumadocs-mdx sets absolutePath on every page it loads from disk
export function postFolder(post: BlogPost): string {
    if (post.absolutePath === undefined) throw new Error(`${post.path} has no file on disk.`);
    return path.dirname(post.absolutePath);
}

export async function summarize(post: BlogPost): Promise<PostSummary> {
    return {
        slug: slugOf(post),
        // next.config.ts sets trailingSlash, so every page url ends in a slash
        url: `${post.url}/`,
        title: post.data.title,
        description: post.data.description,
        authors: authorsOf(post),
        created: post.data.created,
        edited: post.data.edited,
        unlisted: post.data.unlisted,
        minutes: readingMinutes(await post.data.getText('processed')),
        cover: post.data.cover,
        editUrl: `${CONTENT_SOURCE}/${post.path}`
    };
}

// a frontmatter date is a bare YYYY-MM-DD, read here as midnight UTC on that day
export const postDate = (date: string): Date => new Date(`${date}T00:00:00Z`);

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const formatPostDate = (date: string): string => DATE.format(postDate(date));

const LIST = new Intl.ListFormat('en', { type: 'conjunction' });

export const joinList = (items: readonly string[]): string => LIST.format(items);

// each element part's value is the index of its item
export const joinListParts = (count: number): ReturnType<Intl.ListFormat['formatToParts']> =>
    LIST.formatToParts(Array.from({ length: count }, (_, at) => String(at)));

export const lastChanged = (post: Pick<PostSummary, 'created' | 'edited'>): string => post.edited ?? post.created;

export const newestChange = (posts: readonly PostSummary[]): string | undefined =>
    posts.map(lastChanged).toSorted().at(-1);
