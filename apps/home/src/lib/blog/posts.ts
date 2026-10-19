import path from 'node:path';

import { readingMinutes } from '@seedcord/ui/readingTime';
import { twinDocument } from '@seedcord/ui/twin';
import { notFound } from 'next/navigation';

import { REPO_URL } from '#lib/site';

import { AUTHORS_BY_HANDLE } from './authors';
import { postPath } from './paths';
import { formatPostDate, joinList, listedNewestFirst } from './post';
import { blog } from './source';

import type { Author } from './authors';
import type { PostAuthor, PostSummary } from './post';
import type { BlogPost } from './source';

const GITHUB = 'https://github.com';
// pull requests merge into next
const CONTENT_SOURCE = `${REPO_URL}/edit/next/apps/home/content/blog`;

export interface PostParams {
    params: Promise<{ slug: string }>;
}

export class Post {
    private processed: Promise<string> | undefined;

    constructor(private readonly page: BlogPost) {}

    get slug(): string {
        const [slug] = this.page.slugs;
        if (slug === undefined)
            throw new Error(`${this.page.path} is at the root of content/blog. Put it in its own folder.`);
        return slug;
    }

    // fumadocs-mdx sets absolutePath on every page it loads from disk
    get folder(): string {
        if (this.page.absolutePath === undefined) throw new Error(`${this.page.path} has no file on disk.`);
        return path.dirname(this.page.absolutePath);
    }

    get body(): BlogPost['data']['body'] {
        return this.page.data.body;
    }

    async summary(): Promise<PostSummary> {
        const { data } = this.page;
        return {
            slug: this.slug,
            url: postPath(this.slug),
            title: data.title,
            description: data.description,
            authors: this.authors(),
            created: data.created,
            edited: data.edited,
            unlisted: data.unlisted,
            minutes: readingMinutes(await this.text()),
            cover: data.cover,
            editUrl: `${CONTENT_SOURCE}/${this.page.path}`
        };
    }

    async markdown(): Promise<string> {
        const [post, body] = await Promise.all([this.summary(), this.text()]);
        const authors = joinList(post.authors.map((author) => `[${author.name}](${author.url})`));
        const edited = post.edited === undefined ? '' : `, edited ${formatPostDate(post.edited)}`;
        const byline = `By ${authors} on ${formatPostDate(post.created)}${edited}.`;

        return twinDocument({ title: post.title, description: post.description, byline, body });
    }

    private text(): Promise<string> {
        this.processed ??= this.page.data.getText('processed');
        return this.processed;
    }

    private authors(): PostAuthor[] {
        return this.page.data.authors.map((handle) => {
            const author: Author = AUTHORS_BY_HANDLE[handle];
            const github = `${GITHUB}/${handle}`;
            return { handle, name: author.name, url: author.site ?? github, github, avatar: `${github}.png?size=96` };
        });
    }
}

export const allPosts = (): Post[] => blog.getPages().map((page) => new Post(page));

export async function listedPosts(): Promise<PostSummary[]> {
    return listedNewestFirst(await Promise.all(allPosts().map((post) => post.summary())));
}

export const postParams = (): { slug: string }[] => allPosts().map((post) => ({ slug: post.slug }));

export async function postFromParams({ params }: PostParams): Promise<Post> {
    const page = blog.getPage([(await params).slug]);
    if (!page) notFound();
    return new Post(page);
}
