import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { viteKey } from '#core/project/ProjectFiles';

import { ENTRY_DECLARATIONS_NAME } from './output';
import { ServerBuild } from './ServerBuild';
import { exportInstance } from './serverEntry';

import type { BundleStats } from './output';
import type { NextCommand } from './TargetBuild';

const DECLARATIONS_NAME = 'types';

export class ExportBuild extends ServerBuild {
    public nextCommands(): NextCommand[] {
        return [];
    }

    public async bundle(): Promise<BundleStats> {
        const { config, configDir } = this.project;
        const stats = await this.bundleJs(exportInstance(viteKey(configDir, config.instance)));
        await this.writeDeclarations();
        return stats;
    }

    private async writeDeclarations(): Promise<void> {
        const { config } = this.project;
        const { outDir } = this.target;
        const tsconfig = this.project.tsconfig();
        // loaded here so a start build never loads rolldown-plugin-dts or its native parser
        const { dts } = await import('rolldown-plugin-dts');
        await this.buildBot([dts({ emitDtsOnly: true, ...(tsconfig !== undefined && { tsconfig }) })], {
            outDir,
            emptyOutDir: false,
            rolldownOptions: {
                input: { [DECLARATIONS_NAME]: config.instance },
                output: { format: 'esm', entryFileNames: '[name].mjs' }
            }
        });
        // index.mjs exports only the default
        await writeFile(
            join(outDir, ENTRY_DECLARATIONS_NAME),
            `export { default } from './${DECLARATIONS_NAME}.mjs';\n`
        );
    }
}
