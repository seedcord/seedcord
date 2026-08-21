export const MAPPED_TAGS = [
    'pre',
    'h2',
    'h3',
    'h4',
    'p',
    'a',
    'strong',
    'ul',
    'ol',
    'code',
    'blockquote',
    'hr',
    'table',
    'thead',
    'tbody',
    'th',
    'td',
    'img'
] as const;

const REJECTED = new Set<string>([...MAPPED_TAGS, 'h1', 'h5', 'h6']);

const JSX_NODES = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement']);

interface Node {
    type: string;
    name?: string | null;
    children?: Node[];
}

function jsxElementsIn(node: Node): Node[] {
    const here = JSX_NODES.has(node.type) ? [node] : [];

    return [...here, ...(node.children ?? []).flatMap(jsxElementsIn)];
}

interface Reporter {
    fail(reason: string, place: Node): never;
}

export function remarkNoMappedJsx() {
    return (tree: Node, file: Reporter): void => {
        for (const element of jsxElementsIn(tree)) {
            const name = element.name ?? '';
            if (!REJECTED.has(name)) continue;

            file.fail(`write <${name}> as markdown. Written as jsx it renders unstyled.`, element);
        }
    };
}
