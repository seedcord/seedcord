/**
 * Pre-rendered code shape consumed by `CodePanel` and `CodeBlock`.
 * The consumer performs highlighting (shiki etc.) and passes
 * the resulting html; `text` is the raw fallback rendered as `<pre><code>`
 * when html is null.
 */
export interface CodeRepresentation {
    text: string;
    html: string | null;
}
