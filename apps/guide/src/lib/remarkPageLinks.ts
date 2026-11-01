import { withTrailingSlash } from './trailingSlash';

interface Node {
    type: string;
    url?: string;
    children?: Node[];
}

function walk(tree: Node): void {
    for (const child of tree.children ?? []) {
        const carriesUrl = child.type === 'link' || child.type === 'definition';
        if (carriesUrl && child.url !== undefined) child.url = withTrailingSlash(child.url);
        walk(child);
    }
}

export function remarkPageLinks() {
    return (tree: Node): void => {
        walk(tree);
    };
}
