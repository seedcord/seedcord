import { stripVTControlCharacters } from 'node:util';

import type { Terminal } from '#core/output/terminal';

// piped unless it gets a width. `text()` strips the colors and turns no-break spaces into plain ones
export function fakeTerminal(columns?: number): Terminal & { text: () => string } {
    let written = '';
    return {
        isTTY: columns !== undefined,
        columns: columns ?? 0,
        write: (chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        },
        text: () => stripVTControlCharacters(written).replaceAll(' ', ' ')
    };
}
