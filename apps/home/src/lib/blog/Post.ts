import path from 'node:path';

import { readingMinutes } from '@seedcord/ui/readingTime';
import { twinDocument } from '@seedcord/ui/twin';

import { REPO_URL } from '#lib/site';

import { AUTHORS_BY_HANDLE } from './authors';
import { postFolderName, postPath } from './paths';
import { postImageNames } from './postFiles';
import { formatPostDate, joinList } from './summary';

import type { Author } from './authors';
import type { BlogPost } from './source';
import type { PostAuthor, PostSummary } from './summary';

const GITHUB = 'https://github.com';
// pull requests merge into next
const CONTENT_SOURCE = `${REPO_URL}/edit/next/apps/home/content/blog`;

export class Post {
    private processed: Promise<string> | undefined;

    constructor(private readonly page: BlogPost) {}

    // fumadocs-mdx sets absolutePath on every page it loads from disk
    private get file(): string {
        if (this.page.absolutePath === undefined) throw new Error(`${this.page.path} has no file on disk.`);
        return this.page.absolutePath;
    }

    get folder(): string {
        return path.dirname(this.file);
    }

    get slug(): string {
        return postFolderName(this.file);
    }

    images(): string[] {
        return postImageNames(this.file);
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
            return { handle, name: author.name, url: author.site ?? github, github };
        });
    }
}
