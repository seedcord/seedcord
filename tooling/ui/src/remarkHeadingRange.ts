import { visit } from 'unist-util-visit';

import type { Root } from 'mdast';
import type { VFile } from 'vfile';

// the page renders the frontmatter title as the h1
const SHALLOWEST = 2;
// both sites' mdx components map nothing deeper than h4
const DEEPEST = 4;

interface HeadingRangeOptions {
    subject: string;
}

export function remarkHeadingRange({ subject }: HeadingRangeOptions) {
    return (tree: Root, file: VFile): void => {
        visit(tree, 'heading', (heading) => {
            if (heading.depth >= SHALLOWEST && heading.depth <= DEEPEST) return;

            file.fail(
                `This page has an h${heading.depth}. ${subject} can use h2 through h4. Change it to a heading from ## to ####.`,
                heading
            );
        });
    };
}
