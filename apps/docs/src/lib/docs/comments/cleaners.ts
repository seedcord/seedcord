import { HTML_ESCAPE_PATTERN, HTML_ESCAPE_MAP } from './constants';

export function escapeHtml(value: string): string {
    return value.replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPE_MAP[char] ?? char);
}
