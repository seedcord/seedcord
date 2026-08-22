import { rendererRich, transformerTwoslash } from '@shikijs/twoslash';
import { highlightToHtml } from '@seedcord/ui/shiki';
import { removeTwoslashNotations } from 'twoslash/fallback';

import { SAMPLE_AUGMENTATION } from '#lib/sampleTypes';

import type { TwoslashRenderer, TwoslashShikiReturn, TwoslashTypesCache } from '@shikijs/twoslash';
import type { CodeRepresentation } from '@seedcord/ui';
import type { BundledLanguage } from 'shiki';

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
const rich = rendererRich({ queryRendering: 'line', completionIcons: false });

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
    nodeCompletion(completion, node) {
        const partial = rich.nodeCompletion?.call(this, completion, node) ?? {};
        if (partial.type !== 'element') return partial;

        // the list drops to the line's left edge once it becomes a block
        const style = `--ts-col:${String(completion.character)}`;

        return { ...partial, properties: { ...partial.properties, style } };
    }
};

const twoslash = transformerTwoslash({
    langs: ['ts', 'tsx'],
    typesCache,
    renderer,
    twoslashOptions: {
        handbookOptions: { noStaticSemanticInfo: true },
        compilerOptions: { experimentalDecorators: true, types: ['node'] },
        extraFiles: { 'seedcord-gen.d.ts': SAMPLE_AUGMENTATION }
    }
});

export async function twoslashBlock(code: string, lang: BundledLanguage, tagged: boolean): Promise<CodeRepresentation> {
    if (!tagged) return { text: code, html: await highlightToHtml(code, lang) };

    // twoslash strips its own notation only in the html it renders
    // a trailing marker leaves the newline above it behind
    const text = removeTwoslashNotations(code).replace(/\n+$/, '');
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
