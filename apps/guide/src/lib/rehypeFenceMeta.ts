const TITLE = /(?:^|\s)title="([^"]*)"/;
const OUTPUT = /(?:^|\s)output(?:\s|$)/;
const TWOSLASH = /(?:^|\s)twoslash(?:\s|$)/;

export const LANGUAGE_PREFIX = 'language-';

// mdxComponents reads these back off the code element
export const FENCE_ATTR = {
    title: 'data-title',
    output: 'data-output',
    twoslash: 'data-twoslash'
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
            const meta = code.data?.meta ?? '';
            const title = TITLE.exec(meta)?.[1];
            // a title like "build output.ts" would otherwise read as a flag
            const flags = meta.replace(TITLE, ' ');
            const added: Record<string, unknown> = {};

            if (title) added[FENCE_ATTR.title] = title;
            if (OUTPUT.test(flags)) added[FENCE_ATTR.output] = '';
            if (TWOSLASH.test(flags)) {
                const lang = languageOf(code);
                if (!TWOSLASH_LANGS.has(lang)) {
                    const names = [...TWOSLASH_LANGS].join(', ');
                    file.fail(`twoslash checks ${names}. This fence is tagged ${lang || 'nothing'}.`, code);
                }
                added[FENCE_ATTR.twoslash] = '';
            }

            code.properties = { ...code.properties, ...added };
        }
    };
}
