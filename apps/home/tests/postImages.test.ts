import { describe, expect, it } from 'vitest';

import { POST_SLUG, PostFolder } from './mdxPipeline';

const KB = 1024;

describe('an image in a post', () => {
    it('sets src to the image route url and the size to the file size', async () => {
        using post = new PostFolder().webp('shot.webp');

        const code = await post.compile('![the dev tui](./shot.webp)');

        expect(code).toContain(`src="/blog/${POST_SLUG}/shot.webp"`);
        expect(code).toContain('width="4"');
        expect(code).toContain('height="3"');
    });

    it('fails the build on a format other than webp', async () => {
        using post = new PostFolder().bytes('shot.png', 10);

        await expect(post.compile('![the dev tui](./shot.png)')).rejects.toThrow('cwebp shot.png -o shot.webp');
    });

    it('fails the build on a .webp file in another format', async () => {
        using post = new PostFolder().bytes('shot.webp', 10);

        await expect(post.compile('![the dev tui](./shot.webp)')).rejects.toThrow('is not a webp image');
    });

    it('fails the build on a remote image that is not webp', async () => {
        using post = new PostFolder();

        await expect(post.compile('![the banner](https://cdn.seedcord.org/assets/banner.png?v=2)')).rejects.toThrow(
            'cwebp banner.png -o banner.webp'
        );
    });

    it('fails the build on an image with no alt text', async () => {
        using post = new PostFolder().webp('shot.webp');

        await expect(post.compile('![](./shot.webp)')).rejects.toThrow('![what it shows](./shot.webp)');
    });

    it('fails the build on a file over 500 KB', async () => {
        using post = new PostFolder().webp('shot.webp', 500 * KB + 1);

        await expect(post.compile('![the dev tui](./shot.webp)')).rejects.toThrow('over the 500 KB');
    });

    it('compiles a webp of exactly 500 KB', async () => {
        using post = new PostFolder().webp('shot.webp', 500 * KB);

        await expect(post.compile('![the dev tui](./shot.webp)')).resolves.toContain('alt="the dev tui"');
    });

    it('fails the build on a path to a missing file', async () => {
        using post = new PostFolder();

        await expect(post.compile('![the dev tui](./shot.webp)')).rejects.toThrow('next to index.mdx');
    });

    it.each(['../other-post/shot.webp', './img/shot.webp', '/shot.webp'])(
        'fails the build on %s, a path outside the post folder',
        async (src) => {
            using post = new PostFolder();

            await expect(post.compile(`![the dev tui](${src})`)).rejects.toThrow('next to index.mdx');
        }
    );
});
