import { FENCE_ATTR, visitFences } from '@seedcord/ui/fence';
import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';

import type { Root } from 'hast';

// mdx leaves the fence meta out of its output
export function rehypeFenceTitle() {
    return (tree: Root): void => {
        visitFences(tree, (code, meta) => {
            const { title } = parseCodeBlockAttributes(meta, ['title']).attributes;
            if (typeof title === 'string') code.properties = { ...code.properties, [FENCE_ATTR.title]: title };
        });
    };
}
