// TSDoc summaries carry markdown (links, code spans) that a plain-text sink renders literally.
export function plainSummary(text: string): string {
    return text
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // markdown link to its label
        .replace(/`/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
