# Writing a blog post

A post is a folder here with an `index.mdx` in it. The folder name becomes the url, so `typed-custom-ids/index.mdx` shows up at `seedcord.org/blog/typed-custom-ids/`. Use lowercase words joined by hyphens.

Copy [`sample`](./sample) to start. It has one of every block a post can use. Then remove `unlisted: true` from its frontmatter. The build still publishes an unlisted post at its url, but leaves it out of the blog list and the feed and marks the page `noindex`. You can use that to share a draft.

Add yourself to `apps/home/src/lib/blog/authors.ts` before your first post, keyed by your GitHub handle, then list that handle under `authors`.

Images go in the post's folder, written as `![what it shows](./name.webp)`. Each one has to be a webp of 500 KB or less, with alt text and a name made of lowercase words and numbers joined by hyphens, like `shot-1.webp`. Otherwise the build fails with the image's path in the error. Convert a screenshot with `cwebp -q 80 shot.png -o shot.webp`.

Give a fence a `title` to show it as the filename on the code card:

````mdx
```ts title="src/handlers/Ping.ts"
export const ping = 'pong';
```
````

`pnpm -C apps/home dev` serves the blog at `localhost:3000/blog`.
