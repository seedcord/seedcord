import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { imageSize, probe } from '@fumari/image-size';

interface Node {
    type: string;
    url?: string;
    alt?: string | null;
    data?: { hProperties?: Record<string, unknown> };
    children?: Node[];
}

interface Image extends Node {
    type: 'image';
    url: string;
}

// vfile reads the file and the line off the node passed as place
interface PostFile {
    path: string;
    fail(reason: string, place?: Node): never;
}

export interface PostImage {
    src: string;
    width: number;
    height: number;
}

const WEBP = '.webp';
const KB = 1024;
// every post image is committed to git. a webp screenshot is usually 50 to 200 KB
const MAX_IMAGE_KB = 500;

const REMOTE = /^https?:\/\//i;

function isImage(node: Node): node is Image {
    return node.type === 'image';
}

function imagesIn(node: Node): Image[] {
    if (isImage(node)) return [node];

    return (node.children ?? []).flatMap(imagesIn);
}

const fileName = (src: string): string => path.posix.basename(src.split(/[?#]/)[0] ?? src);

function formatProblem(src: string): string | undefined {
    const name = fileName(src);
    if (name.endsWith(WEBP)) return undefined;

    const webp = `${name.slice(0, name.length - path.posix.extname(name).length)}${WEBP}`;
    return `${src} is not a webp. Every post image has to be a webp. Convert it with \`cwebp ${name} -o ${webp}\`.`;
}

// the image route serves every file in a post's folder at /blog/<slug>/<file>
function postImageUrl(postFile: string, name: string): string {
    return `/blog/${path.basename(path.dirname(postFile))}/${name}`;
}

export function readPostImage(src: string, postFile: string): PostImage | string {
    const formatError = formatProblem(src);
    if (formatError !== undefined) return formatError;

    const name = fileName(src);
    if (path.posix.normalize(src) !== name) {
        return `${src} is outside the post's folder. Move the image next to index.mdx and write it as ./${name}.`;
    }

    const file = path.join(path.dirname(postFile), name);
    const bytes = statSync(file, { throwIfNoEntry: false })?.size;
    if (bytes === undefined) return `${src} does not exist. Put the image in the post's folder, next to index.mdx.`;
    if (bytes > MAX_IMAGE_KB * KB) {
        return `${src} is ${Math.ceil(bytes / KB)} KB, over the ${MAX_IMAGE_KB} KB limit. Compress it with \`cwebp -q 75\`, or crop it.`;
    }

    const size = imageSize(readFileSync(file));
    if (size?.type !== 'webp') return `${src} is not a webp image. Convert it with \`cwebp\` and keep the .webp name.`;

    return { src: postImageUrl(postFile, name), width: size.width, height: size.height };
}

async function sizeOf(image: Image, file: PostFile): Promise<PostImage> {
    if (!REMOTE.test(image.url)) {
        const read = readPostImage(image.url, file.path);
        return typeof read === 'string' ? file.fail(read, image) : read;
    }

    const problem = formatProblem(image.url);
    if (problem !== undefined) file.fail(problem, image);

    try {
        const { width, height } = await probe(image.url);
        return { src: image.url, width, height };
    } catch (error) {
        return file.fail(
            `${image.url} could not be read (${String(error)}). Check the url, or put the image in the post's folder.`,
            image
        );
    }
}

export function remarkPostImages() {
    return async (tree: Node, file: PostFile): Promise<void> => {
        const images = imagesIn(tree);
        for (const image of images) {
            if (!image.alt?.trim())
                file.fail(`${image.url} has no alt text. Write it as ![what it shows](${image.url}).`, image);
        }

        await Promise.all(
            images.map(async (image) => {
                const { src, width, height } = await sizeOf(image, file);
                image.url = src;
                image.data = { ...image.data, hProperties: { ...image.data?.hProperties, src, width, height } };
            })
        );
    };
}
