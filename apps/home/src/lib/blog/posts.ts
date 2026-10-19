import { notFound } from 'next/navigation';

import { Post } from './Post';
import { blog } from './source';
import { listedNewestFirst } from './summary';

import type { PostSummary } from './summary';

export interface PostParams {
    params: Promise<{ slug: string }>;
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

export async function summaryFromParams(route: PostParams): Promise<PostSummary> {
    return (await postFromParams(route)).summary();
}
