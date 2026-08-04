/**
 * Pre-rendered code with optional highlighted HTML.
 * Falls back to `text` when `html` is null.
 */
export interface CodeRepresentation {
    text: string;
    html: string | null;
}
