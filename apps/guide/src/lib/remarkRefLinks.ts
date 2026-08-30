const PROTOCOL = 'ref:';
const FORM = 'Write [text](ref:<package>/<Symbol>) for a symbol, or [text](ref:<package>) for a package.';

const JSX_NODES = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement']);

interface Point {
    line: number;
    column: number;
    offset?: number | undefined;
}

interface Node {
    type: string;
    url?: string;
    name?: string | null;
    position?: { start: Point; end: Point } | undefined;
    attributes?: { type: string; name: string; value: string }[];
    children?: Node[];
}

interface Reporter {
    fail(reason: string, place: Node): never;
}

function hasRefTarget(node: Node): boolean {
    return (node.url ?? '').startsWith(PROTOCOL);
}

function isRefJsx(node: Node): boolean {
    return JSX_NODES.has(node.type) && node.name === 'Ref';
}

function refElement(link: Node, file: Reporter): Node {
    const url = link.url ?? '';
    const target = url.slice(PROTOCOL.length);
    const slash = target.indexOf('/');
    const named = slash !== -1;
    const pkg = named ? target.slice(0, slash) : target;
    const symbol = named ? target.slice(slash + 1) : '';

    if (pkg === '' || (named && (symbol === '' || symbol.includes('/')))) {
        file.fail(`${url} is missing the package or the symbol. ${FORM}`, link);
    }
    if ((link.children ?? []).length === 0) file.fail(`${url} has no link text. ${FORM}`, link);

    return {
        type: 'mdxJsxTextElement',
        name: 'Ref',
        attributes: [
            { type: 'mdxJsxAttribute', name: 'pkg', value: pkg },
            { type: 'mdxJsxAttribute', name: 'symbol', value: symbol }
        ],
        children: link.children ?? [],
        position: link.position
    };
}

function walk(tree: Node, file: Reporter, inHeading: boolean): void {
    if (!tree.children) return;

    const heading = inHeading || tree.type === 'heading';

    tree.children = tree.children.map((child) => {
        if (isRefJsx(child)) {
            file.fail(`prettier splits an inline <Ref> onto its own line. ${FORM}`, child);
        }
        // mdast resolves a definition against its linkReference after every remark plugin has run
        if (child.type === 'definition' && hasRefTarget(child)) {
            file.fail(`a link definition stays a plain url. ${FORM}`, child);
        }

        walk(child, file, heading);

        if (child.type !== 'link' || !hasRefTarget(child)) return child;
        if (heading) {
            file.fail('a heading takes no symbol link. Its text also renders in the table of contents.', child);
        }

        return refElement(child, file);
    });
}

export function remarkRefLinks() {
    return (tree: Node, file: Reporter): void => {
        walk(tree, file, false);
    };
}
