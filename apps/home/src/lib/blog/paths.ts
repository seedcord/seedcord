import path from 'node:path';

export const BLOG_PATH = '/blog/';
export const FEED_PATH = `${BLOG_PATH}rss.xml`;

// next.config.ts sets trailingSlash
export const postPath = (slug: string): string => `${BLOG_PATH}${slug}/`;
export const ogImagePath = (slug: string): string => `${postPath(slug)}og.png`;
export const twinPath = (slug: string): string => `${postPath(slug)}index.md`;

export const postFolderName = (postFile: string): string => path.basename(path.dirname(postFile));
