import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { imageSize } from '@fumari/image-size';
import { visit } from 'unist-util-visit';

import { postFolderName, postPath } from './paths';

import type { Root } from 'mdast';
// adds hProperties to the mdast node data type
import type {} from 'mdast-util-to-hast';
import type { VFile } from 'vfile';

interface PostImage {
    src: string;
    width: number;
    height: number;
}

type ImageRead = { ok: true; image: PostImage } | { ok: false; reason: string };

const unusable = (reason: string): ImageRead => ({ ok: false, reason });

const WEBP = '.webp';
const KB = 1024;
// every post image is committed to git. a webp screenshot is usually 50 to 200 KB
const MAX_IMAGE_KB = 500;

const isUrlSlug = (text: string): boolean => text.split('-').every((word) => /^[a-z0-9]+$/.test(word));

export function readPostImage(src: string, postFile: string): ImageRead {
    const name = path.posix.basename(src);
    if (!name.endsWith(WEBP)) {
        const webp = `${name.slice(0, name.length - path.posix.extname(name).length)}${WEBP}`;
        return unusable(`${src} is not a webp. Convert it with \`cwebp -q 80 ${name} -o ${webp}\`.`);
    }

    if (!isUrlSlug(name.slice(0, -WEBP.length))) {
        return unusable(
            `${src} is not a valid image url. Rename it to lowercase words and numbers joined by hyphens, like shot-1.webp.`
        );
    }

    if (path.posix.normalize(src) !== name) {
        return unusable(
            `${src} is outside the post's folder. Move the image next to index.mdx and write it as ./${name}.`
        );
    }

    const file = path.join(path.dirname(postFile), name);
    const bytes = statSync(file, { throwIfNoEntry: false })?.size;
    if (bytes === undefined) {
        return unusable(`${src} does not exist. Put the image in the post's folder, next to index.mdx.`);
    }
    if (bytes > MAX_IMAGE_KB * KB) {
        return unusable(
            `${src} is ${Math.ceil(bytes / KB)} KB, over the ${MAX_IMAGE_KB} KB limit. Compress it with \`cwebp -q 80\`, or crop it.`
        );
    }

    const size = imageSize(readFileSync(file));
    if (size?.type !== 'webp') {
        return unusable(`${src} is not a webp image. Convert it with \`cwebp\` and keep the .webp name.`);
    }

    // the image route serves each webp in the post's folder at this url
    const url = `${postPath(postFolderName(postFile))}${name}`;
    return { ok: true, image: { src: url, width: size.width, height: size.height } };
}

// the image route publishes every webp in the folder, including ones the post never shows
export function postImageNames(postFile: string): string[] {
    const names: string[] = [];
    for (const name of readdirSync(path.dirname(postFile))) {
        if (!name.endsWith(WEBP)) continue;

        const read = readPostImage(`./${name}`, postFile);
        if (!read.ok) throw new Error(read.reason);
        names.push(name);
    }
    return names;
}

export function remarkPostFiles() {
    return (tree: Root, file: VFile): void => {
        const folder = postFolderName(file.path);
        if (!isUrlSlug(folder)) {
            file.fail(
                `The post folder "${folder}" is not a valid post url. Rename it to lowercase words and numbers joined by hyphens.`
            );
        }

        const definitions = new Map<string, string>();
        visit(tree, 'definition', (definition) => {
            definitions.set(definition.identifier, definition.url);
        });
        visit(tree, 'imageReference', (reference) => {
            const alt = reference.alt ?? 'what it shows';
            const url = definitions.get(reference.identifier) ?? './name.webp';
            file.fail(
                `${reference.label ?? reference.identifier} is a reference-style image. Write it inline as ![${alt}](${url}).`,
                reference
            );
        });

        visit(tree, 'image', (image) => {
            if (!image.alt?.trim())
                file.fail(`${image.url} has no alt text. Write it as ![what it shows](${image.url}).`, image);

            const read = readPostImage(image.url, file.path);
            if (!read.ok) file.fail(read.reason, image);

            const { src, width, height } = read.image;
            image.url = src;
            image.data = { ...image.data, hProperties: { ...image.data?.hProperties, width, height } };
        });
    };
}
