import { rendererRich, transformerTwoslash } from '@shikijs/twoslash';
import { highlightToHtml } from '@seedcord/ui/shiki';
import ts from 'typescript';
import { createTwoslasher } from 'twoslash';
import { removeTwoslashNotations } from 'twoslash/fallback';
import { removeCodeRanges, resolveNodePositions } from 'twoslash-protocol';

import { SAMPLE_AUGMENTATION } from '#lib/sampleTypes';
import { referenceFor } from '#lib/symbolRef';

import type {
    TwoslashRenderer,
    TwoslashShikiFunction,
    TwoslashShikiReturn,
    TwoslashTypesCache
} from '@shikijs/twoslash';
import type { SymbolReference } from '#lib/symbolRef';
import type { CodeRepresentation } from '@seedcord/ui';
import type { BundledLanguage } from 'shiki';
import type { NodeHover, Range } from 'twoslash-protocol';

type HoverWithRef = NodeHover & { ref?: SymbolReference };

// renderDual runs the same source through shiki once per theme, back to back
let previous: { key: string; data: TwoslashShikiReturn } | null = null;

// twoslash reports different errors for one sample under tsx
function cacheKey(code: string, lang: string | undefined): string {
    return `${lang ?? ''} ${code}`;
}

const typesCache: TwoslashTypesCache = {
    read: (code, lang) => {
        const key = cacheKey(code, lang);

        return previous?.key === key ? previous.data : null;
    },
    write: (code, data, lang) => {
        previous = { key: cacheKey(code, lang), data };
    }
};

// every popup the rich renderer positions absolutely gets clipped by the code block's scroll area
const rich = rendererRich({ queryRendering: 'line', completionIcons: false, jsdoc: false });

const renderer: TwoslashRenderer = {
    ...rich,
    lineError(error) {
        const nodes = rich.lineError?.call(this, error) ?? [];
        const [first] = nodes;
        // css reads this to put the caret under the middle of the squiggle
        const middle = error.character + error.length / 2;
        if (first?.type === 'element') {
            first.properties = { ...first.properties, style: `--ts-col:${String(middle)}` };
        }

        return nodes;
    },
    nodeStaticInfo(info, node) {
        const element = rich.nodeStaticInfo?.call(this, info, node) ?? node;
        const { ref } = info as HoverWithRef;
        if (!ref || element.type !== 'element') return element;

        element.properties = { ...element.properties, 'data-ref-pkg': ref.pkg, 'data-ref-symbol': ref.symbol };

        return element;
    },
    nodeCompletion(completion, node) {
        const partial = rich.nodeCompletion?.call(this, completion, node) ?? {};
        if (partial.type !== 'element') return partial;

        // the list drops to the line's left edge once it becomes a block
        const style = `--ts-col:${String(completion.character)}`;

        return { ...partial, properties: { ...partial.properties, style } };
    }
};

const INDENTS = /^[ \t]*(?=\S)/gm;

function commonIndent(code: string): number {
    const found = code.match(INDENTS) ?? [];

    return found.reduce((width, indent) => Math.min(width, indent.length), Infinity);
}

function indentRanges(code: string, width: number): [number, number][] {
    const ranges: [number, number][] = [];
    let index = 0;
    for (const line of code.split('\n')) {
        if (line.trim()) ranges.push([index, index + width]);
        index += line.length + 1;
    }

    return ranges;
}

function dedent(code: string): string {
    const width = commonIndent(code);
    if (!Number.isFinite(width) || width === 0) return code;

    return code.replace(new RegExp(`^[ \\t]{${String(width)}}`, 'gm'), '');
}

const compile = createTwoslasher();

const VIRTUAL = 'index.ts';

function leafAt(node: ts.Node, source: ts.SourceFile, offset: number): ts.Node {
    for (const child of node.getChildren(source)) {
        if (child.getStart(source) <= offset && offset < child.getEnd()) return leafAt(child, source, offset);
    }

    return node;
}

// a cut removes the imports that resolve these symbols
function beforeCuts(offset: number, removals: readonly Range[]): number {
    return [...removals]
        .sort((a, b) => a[0] - b[0])
        .reduce((moved, [start, end]) => (start <= moved ? moved + (end - start) : moved), offset);
}

function refAt(checker: ts.TypeChecker, source: ts.SourceFile, offset: number): SymbolReference | null {
    const symbol = checker.getSymbolAtLocation(leafAt(source, source, offset));
    const target = symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const declared = target?.declarations?.[0]?.getSourceFile().fileName;
    if (!target || !declared) return null;

    return referenceFor(declared, checker.getFullyQualifiedName(target));
}

function attachRefs(input: string, result: ReturnType<typeof compile>): void {
    const hovers = result.nodes.filter((node): node is NodeHover => node.type === 'hover');
    const env = [...(compile.getCacheMap()?.values() ?? [])][0];
    if (hovers.length === 0 || !env) return;

    // twoslash deletes the virtual file when the run ends
    env.createFile(VIRTUAL, input);
    try {
        const program = env.languageService.getProgram();
        const source = program?.getSourceFiles().find((file) => file.fileName === VIRTUAL);
        if (!program || !source) return;

        const checker = program.getTypeChecker();
        for (const hover of hovers) {
            const ref = refAt(checker, source, beforeCuts(hover.start, result.meta.removals));
            if (ref) (hover as HoverWithRef).ref = ref;
        }
    } finally {
        env.deleteFile(VIRTUAL);
    }
}

// a cut inside a class body leaves every visible line indented under a method that no longer renders
const dedenting: TwoslashShikiFunction = (input, extension, options) => {
    const result = compile(input, extension, options);
    attachRefs(input, result);
    const width = commonIndent(result.code);
    if (!Number.isFinite(width) || width === 0) return result;

    const { code, nodes } = removeCodeRanges(result.code, indentRanges(result.code, width), result.nodes);

    return { ...result, code, nodes: resolveNodePositions(nodes, code) };
};

const TWOSLASH_OPTIONS = {
    handbookOptions: { noStaticSemanticInfo: false },
    compilerOptions: { experimentalDecorators: true, types: ['node'] },
    extraFiles: { 'seedcord-gen.d.ts': SAMPLE_AUGMENTATION }
};

const twoslash = transformerTwoslash({
    langs: ['ts', 'tsx'],
    typesCache,
    renderer,
    twoslasher: dedenting,
    twoslashOptions: TWOSLASH_OPTIONS
});

export async function twoslashBlock(code: string, lang: BundledLanguage, tagged: boolean): Promise<CodeRepresentation> {
    if (!tagged) return { text: code, html: await highlightToHtml(code, lang) };

    // twoslash strips its own notation only in the html it renders
    // a trailing marker leaves the newline above it behind
    const text = dedent(removeTwoslashNotations(code).replace(/\n+$/, ''));
    // type-checking every block stalls next dev past a handful on one page
    if (process.env.TWOSLASH === '0') return { text, html: await highlightToHtml(text, lang) };

    try {
        // a sample that stopped compiling would otherwise render as plain text and pass the build
        return { text, html: await highlightToHtml(code, lang, { transformers: [twoslash], throwOnFailure: true }) };
    } catch (error) {
        // a bad marker reaches typescript as a bare "Debug Failure" with no file and no line
        throw new Error(`twoslash failed on this sample:\n\n${code}\n\n${String(error)}`, { cause: error });
    }
}
