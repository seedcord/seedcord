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

const WEBP = '.webp';
const KB = 1024;
// every post image is committed to git. a webp screenshot is usually 50 to 200 KB
const MAX_IMAGE_KB = 500;

export function readPostImage(src: string, postFile: string): PostImage | string {
    const name = path.posix.basename(src);
    if (!name.endsWith(WEBP)) {
        const webp = `${name.slice(0, name.length - path.posix.extname(name).length)}${WEBP}`;
        return `${src} is not a webp. Every post image has to be a webp. Convert it with \`cwebp -q 80 ${name} -o ${webp}\`.`;
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

const isUrlSlug = (folder: string): boolean => folder.split('-').every((word) => /^[a-z0-9]+$/.test(word));

// the image route publishes every webp in the folder, including ones the post never shows
export function postImageNames(postFile: string): string[] {
    return readdirSync(path.dirname(postFile))
        .filter((name) => name.endsWith(WEBP))
        .map((name) => {
            const read = readPostImage(`./${name}`, postFile);
            if (typeof read === 'string') throw new Error(read);
            return name;
        });
}

export function remarkPostFiles() {
    return (tree: Root, file: VFile): void => {
        const folder = postFolderName(file.path);
        if (!isUrlSlug(folder)) {
            file.fail(
                `The post folder "${folder}" becomes the url. Rename the folder to lowercase words joined by hyphens.`
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
            if (typeof read === 'string') file.fail(read, image);

            image.url = read.src;
            image.data = {
                ...image.data,
                hProperties: { ...image.data?.hProperties, width: read.width, height: read.height }
            };
        });
    };
}
