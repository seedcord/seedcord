// TSDoc summaries carry markdown (links, code spans) that a plain-text sink renders literally.
export function plainSummary(text: string): string {
    return text
        .replace(/\[([^\]]+)\]\((?:\/|#|https?:\/\/)[^)]*\)/g, '$1')
        .replace(/`/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
