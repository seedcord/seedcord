/**
 * Pre-rendered code shape consumed by `CodePanel` and `CodeBlock`.
 * The consumer is responsible for highlighting (shiki etc.) and passing
 * the resulting html; `text` is the raw fallback rendered as `<pre><code>`
 * when html is null.
 */
export interface CodeRepresentation {
    text: string;
    html: string | null;
}
