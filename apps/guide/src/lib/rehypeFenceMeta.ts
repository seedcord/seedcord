import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';

// a name outside this list stays in the meta untouched
const FENCE_NAMES = ['title', 'output', 'twoslash', 'hovers'];

export const LANGUAGE_PREFIX = 'language-';

// mdxComponents reads these back off the code element
export const FENCE_ATTR = {
    title: 'data-title',
    output: 'data-output',
    twoslash: 'data-twoslash',
    hovers: 'data-hovers'
} as const;

const TWOSLASH_LANGS = new Set(['ts', 'tsx', 'typescript']);

interface Element {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    data?: { meta?: string };
    children?: Element[];
}

interface Reporter {
    fail(reason: string, place: Element): never;
}

function codeElements(node: Element): Element[] {
    if (node.type === 'element' && node.tagName === 'code') return [node];

    return (node.children ?? []).flatMap(codeElements);
}

function languageOf(code: Element): string {
    const names = code.properties?.className;
    const list = Array.isArray(names) ? names : [names];

    for (const name of list) {
        if (typeof name === 'string' && name.startsWith(LANGUAGE_PREFIX)) return name.slice(LANGUAGE_PREFIX.length);
    }

    return '';
}

// remark-rehype writes the fence meta to data.meta
export function rehypeFenceMeta() {
    return (tree: Element, file: Reporter): void => {
        for (const code of codeElements(tree)) {
            const { attributes } = parseCodeBlockAttributes(code.data?.meta ?? '', FENCE_NAMES);
            const added: Record<string, unknown> = {};

            if (typeof attributes.title === 'string') added[FENCE_ATTR.title] = attributes.title;
            if ('output' in attributes) added[FENCE_ATTR.output] = '';
            if ('twoslash' in attributes) {
                const lang = languageOf(code);
                if (!TWOSLASH_LANGS.has(lang)) {
                    const names = [...TWOSLASH_LANGS].join(', ');
                    file.fail(`twoslash checks ${names}. This fence is tagged ${lang || 'nothing'}.`, code);
                }
                added[FENCE_ATTR.twoslash] = '';
                if ('hovers' in attributes) added[FENCE_ATTR.hovers] = '';
            } else if ('hovers' in attributes) {
                file.fail('hovers needs twoslash on the same fence.', code);
            }

            code.properties = { ...code.properties, ...added };
        }
    };
}
