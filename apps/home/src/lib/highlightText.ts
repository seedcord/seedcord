import { compact } from 'es-toolkit';

interface Marks {
    root: Element;
    texts: readonly string[];
}

// the text can span several elements, like the tokens of one highlighted line
function rangeOf(root: Element, text: string): Range | undefined {
    const start = root.textContent.indexOf(text);
    if (start === -1) return undefined;

    const end = start + text.length;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();

    let seen = 0;
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const length = node.textContent?.length ?? 0;
        if (start >= seen && start < seen + length) range.setStart(node, start - seen);
        if (end > seen && end <= seen + length) {
            range.setEnd(node, end - seen);
            return range;
        }
        seen += length;
    }

    return undefined;
}

// styles/utilities.css draws each highlight by its name. return the result from an effect to clean up
export function highlightText(highlights: Record<string, readonly Marks[]>): (() => void) | undefined {
    // firefox added the highlight registry in 140
    if (!('highlights' in CSS)) return undefined;

    for (const [name, marks] of Object.entries(highlights)) {
        const ranges = marks.flatMap(({ root, texts }) => texts.map((text) => rangeOf(root, text)));
        CSS.highlights.set(name, new Highlight(...compact(ranges)));
    }

    return () => {
        for (const name of Object.keys(highlights)) CSS.highlights.delete(name);
    };
}
