import { stripVTControlCharacters } from 'node:util';

import { describe, expect, it } from 'vitest';

import { BUILD_STEPS } from '#commands/build/BuildRunner';
import { printBuildSummary } from '#commands/build/printBuildSummary';
import { StepPrinter } from '#core/output/StepPrinter';

import type { BuildResult } from '#commands/build/BuildRunner';

function summaryFor(result: BuildResult): string {
    let written = '';
    const stdout = {
        isTTY: false,
        columns: 80,
        write: (chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        }
    };
    const printer = new StepPrinter({ command: 'build', labels: BUILD_STEPS, verbose: false, stdout, stderr: stdout });

    printBuildSummary(printer, result);
    return stripVTControlCharacters(written);
}

const bundle = { modules: 7, textFiles: 4, bytes: 186_400, entry: '/bot/dist/index.mjs' };

describe('printBuildSummary', () => {
    it('counts what was bundled and points at the entry', () => {
        expect(summaryFor({ bundle, nextCommands: [] })).toContain('7 modules, 4 text files, 186.4 kB → ');
    });

    it('lines the next commands up under one label column', () => {
        const summary = summaryFor({
            bundle,
            nextCommands: [
                ['run', 'node dist/index.mjs'],
                ['compile', 'bun build --compile dist/index.mjs --outfile bot']
            ]
        });

        expect(summary).toContain('\n  run      node dist/index.mjs\n');
        expect(summary).toContain('\n  compile  bun build --compile dist/index.mjs --outfile bot\n');
    });
});
