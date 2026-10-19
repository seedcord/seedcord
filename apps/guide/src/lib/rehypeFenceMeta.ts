import { languageOf, visitFences } from '@seedcord/ui/fence';
import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';

import type { Properties, Root } from 'hast';
import type { VFile } from 'vfile';

export const FENCE_ATTR = {
    output: 'data-output',
    twoslash: 'data-twoslash',
    hovers: 'data-hovers'
} as const;

// the markdown twin strips these back out
export const FENCE_MODES = ['twoslash', 'hovers'];

const FENCE_NAMES = ['output', ...FENCE_MODES];

const TWOSLASH_LANGS = new Set(['ts', 'tsx', 'typescript']);

export function rehypeFenceMeta() {
    return (tree: Root, file: VFile): void => {
        visitFences(tree, (code, meta) => {
            const { attributes } = parseCodeBlockAttributes(meta, FENCE_NAMES);
            const added: Properties = {};

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
        });
    };
}
