import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { imageSize } from '@fumari/image-size';
import { visit } from 'unist-util-visit';

import { postFolderName, postPath } from './paths';

import type { Root } from 'mdast';
import type {} from 'mdast-util-to-hast';
import type { VFile } from 'vfile';

interface PostImage {
    src: string;
    width: number;
    height: number;
}

const WEBP = '.webp';
const KB = 1024;
// every post image is committed to git. a webp screenshot is usually 50 to 200 KB
const MAX_IMAGE_KB = 500;

export function readPostImage(src: string, postFile: string): PostImage | string {
    const name = path.posix.basename(src);
    if (!name.endsWith(WEBP)) {
        const webp = `${name.slice(0, name.length - path.posix.extname(name).length)}${WEBP}`;
        return `${src} is not a webp. Every post image has to be a webp. Convert it with \`cwebp ${name} -o ${webp}\`.`;
    }

    if (path.posix.normalize(src) !== name) {
        return `${src} is outside the post's folder. Move the image next to index.mdx and write it as ./${name}.`;
    }

    const file = path.join(path.dirname(postFile), name);
    const bytes = statSync(file, { throwIfNoEntry: false })?.size;
    if (bytes === undefined) return `${src} does not exist. Put the image in the post's folder, next to index.mdx.`;
    if (bytes > MAX_IMAGE_KB * KB) {
        return `${src} is ${Math.ceil(bytes / KB)} KB, over the ${MAX_IMAGE_KB} KB limit. Compress it with \`cwebp -q 80\`, or crop it.`;
    }

    const size = imageSize(readFileSync(file));
    if (size?.type !== 'webp') return `${src} is not a webp image. Convert it with \`cwebp\` and keep the .webp name.`;

    // the image route serves each webp in the post's folder at this url
    return { src: `${postPath(postFolderName(postFile))}${name}`, width: size.width, height: size.height };
}

export function remarkPostImages() {
    return (tree: Root, file: VFile): void => {
        visit(tree, 'image', (image) => {
            if (!image.alt?.trim())
                file.fail(`${image.url} has no alt text. Write it as ![what it shows](${image.url}).`, image);

            const read = readPostImage(image.url, file.path);
            if (typeof read === 'string') file.fail(read, image);

            image.url = read.src;
            image.data = { ...image.data, hProperties: { ...image.data?.hProperties, ...read } };
        });
    };
}
