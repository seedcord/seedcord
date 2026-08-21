// page.tsx renders the frontmatter title as the h1
const SHALLOWEST = 2;
// mdxComponents.tsx does not map anything deeper than h4
const DEEPEST = 4;

interface Node {
    type: string;
    children?: Node[];
}

interface Heading extends Node {
    type: 'heading';
    depth: number;
}

function isHeading(node: Node): node is Heading {
    return node.type === 'heading';
}

function headingsIn(node: Node): Heading[] {
    if (isHeading(node)) return [node];

    return (node.children ?? []).flatMap(headingsIn);
}

// vfile reads the file and the line off the node passed as place
interface Reporter {
    fail(reason: string, place: Node): never;
}

export function remarkHeadingRange() {
    return (tree: Node, file: Reporter): void => {
        for (const heading of headingsIn(tree)) {
            if (heading.depth >= SHALLOWEST && heading.depth <= DEEPEST) continue;

            file.fail(`this page writes an h${heading.depth}. The guide takes h2 through h4.`, heading);
        }
    };
}
