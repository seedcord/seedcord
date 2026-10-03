import { DocsLinks } from './DocsLinks';
import { SymbolRef } from './SymbolRef';

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
    return SymbolRef.isRefUrl(node.url ?? '');
}

function isRefJsx(node: Node): boolean {
    return JSX_NODES.has(node.type) && node.name === 'Ref';
}

function refHref(link: Node, links: DocsLinks, file: Reporter): string {
    const url = link.url ?? '';
    const ref = SymbolRef.fromUrl(url) ?? file.fail(`${url} is missing the package or the symbol. ${FORM}`, link);
    if (!links.hasPackage(ref.pkg)) file.fail(`${url} points at a package the reference site does not list`, link);

    return links.href(ref) ?? file.fail(`${url} is not a symbol the reference site documents`, link);
}

function refElement(link: Node, links: DocsLinks, file: Reporter): Node {
    const href = refHref(link, links, file);
    if ((link.children ?? []).length === 0) file.fail(`${link.url ?? ''} has no link text. ${FORM}`, link);

    return {
        type: 'mdxJsxTextElement',
        name: 'Ref',
        attributes: [{ type: 'mdxJsxAttribute', name: 'href', value: href }],
        children: link.children ?? [],
        position: link.position
    };
}

function walk(tree: Node, links: DocsLinks, file: Reporter, inHeading: boolean): void {
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

        walk(child, links, file, heading);

        if (child.type !== 'link' || !hasRefTarget(child)) return child;
        if (heading) {
            file.fail('a heading takes no symbol link. Its text also renders in the table of contents.', child);
        }

        return refElement(child, links, file);
    });
}

export function remarkRefLinks() {
    return async (tree: Node, file: Reporter): Promise<void> => {
        walk(tree, await DocsLinks.load(), file, false);
    };
}
