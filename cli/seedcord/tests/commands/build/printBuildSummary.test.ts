import { describe, expect, it } from 'vite-plus/test';

import { BUILD_STEPS } from '#commands/build/BuildRunner';
import { printBuildSummary } from '#commands/build/printBuildSummary';
import { StepPrinter } from '#core/output/StepPrinter';
import { fakeTerminal } from '#tests/fakeTerminal';

import type { BuildResult } from '#commands/build/BuildRunner';

function summaryFor(result: BuildResult): string {
    const stdout = fakeTerminal();
    const printer = new StepPrinter({ command: 'build', labels: BUILD_STEPS, verbose: false, stdout, stderr: stdout });

    printBuildSummary(printer, result);
    return stdout.text();
}

const bundle = { modules: 7, listedFiles: 4, bytes: 186_400, entry: '/bot/dist/index.mjs' };

describe('printBuildSummary', () => {
    it('counts what was bundled and points at the entry', () => {
        expect(summaryFor({ bundle, nextCommands: [] })).toContain('7 modules, 4 listed files, 186.4 kB → ');
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
