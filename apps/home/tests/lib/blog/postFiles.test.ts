import { describe, expect, it } from 'vitest';

import { postImageNames } from '#lib/blog/postFiles';
import { POST_SLUG, PostFolder } from '#tests/mdxPipeline';

const KB = 1024;

describe('the files of a post', () => {
    it("sets src to the image route url and the size to the image's pixels", async () => {
        using post = new PostFolder().webp('shot.webp');

        const code = await post.compile('![the dev tui](./shot.webp)');

        expect(code).toContain(`src="/blog/${POST_SLUG}/shot.webp"`);
        expect(code).toContain('width="4"');
        expect(code).toContain('height="3"');
    });

    it('fails the build on a format other than webp', async () => {
        using post = new PostFolder().bytes('shot.png', 10);

        await expect(post.compile('![the dev tui](./shot.png)')).rejects.toThrow('cwebp -q 80 shot.png -o shot.webp');
    });

    it('fails the build on a .webp file in another format', async () => {
        using post = new PostFolder().bytes('shot.webp', 10);

        await expect(post.compile('![the dev tui](./shot.webp)')).rejects.toThrow('is not a webp image');
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

    it('fails the build on a reference-style image', async () => {
        using post = new PostFolder().webp('shot.webp');

        await expect(post.compile('![the dev tui][shot]\n\n[shot]: ./shot.webp')).rejects.toThrow(
            'Write it inline as ![the dev tui](./shot.webp)'
        );
    });

    it.each(['shot#1.webp', 'Shot.webp', 'my shot.webp'])('fails the build on an image named %s', async (name) => {
        using post = new PostFolder().webp(name);

        await expect(post.compile(`![the dev tui](<./${name}>)`)).rejects.toThrow('is not a valid image url');
    });

    it('fails the build on a webp over 500 KB that the post never shows', () => {
        using post = new PostFolder().webp('shot.webp').webp('unused.webp', 500 * KB + 1);

        expect(() => postImageNames(post.file)).toThrow('./unused.webp is 501 KB');
    });

    it.each(['typed custom-ids', 'c#-tips', 'Typed-Ids'])(
        'fails the build on a post folder named %s',
        async (folder) => {
            using post = new PostFolder(folder);

            await expect(post.compile('A post.')).rejects.toThrow('is not a valid post url');
        }
    );

    it.each(['../other-post/shot.webp', './img/shot.webp', '/shot.webp', 'https://cdn.seedcord.org/shot.webp'])(
        'fails the build on %s, a path outside the post folder',
        async (src) => {
            using post = new PostFolder().webp('shot.webp');

            await expect(post.compile(`![the dev tui](${src})`)).rejects.toThrow("outside the post's folder");
        }
    );
});
