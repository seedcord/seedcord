import { join, posix } from 'node:path';

import Handlebars from 'handlebars';

import { CLI_HELPERS } from './helpers';
import { splitName } from './splitName';
import { cliVariables } from './variables';

import type { TemplateFile } from './Template';
import type { Runtime, Transport } from '@seedcord/core/internal';
import type { JsonObject } from 'type-fest';

export interface RenderProject {
    readonly root: string;
    readonly transport: Transport;
    readonly runtime: Runtime;
    readonly helpers: Readonly<Record<string, Handlebars.HelperDelegate>>;
}

export interface RenderedFile {
    readonly path: string;
    readonly contents: string;
}

interface Target {
    readonly file: TemplateFile;
    readonly path: string;
}

export class TemplateOutput {
    private readonly handlebars = Handlebars.create();
    private readonly name: string;
    private readonly targets: readonly Target[];

    constructor(
        files: readonly TemplateFile[],
        nameWithFolder: string,
        private readonly project: RenderProject
    ) {
        const { folder, name } = splitName(nameWithFolder);
        this.name = name;
        this.handlebars.registerHelper(CLI_HELPERS);
        this.handlebars.registerHelper(project.helpers);
        this.targets = files.map((file) => ({
            file,
            path: join(
                project.root,
                posix.dirname(file.layout),
                folder,
                this.compile(posix.basename(file.layout))({ name: this.name })
            )
        }));
    }

    public get paths(): string[] {
        return this.targets.map(({ path }) => path);
    }

    public render(answers: JsonObject): RenderedFile[] {
        return this.targets.map(({ file, path }) => {
            const context = { ...answers, name: this.name, ...cliVariables({ project: this.project, path }) };
            return { path, contents: this.compile(file.source)(context) };
        });
    }

    private compile(source: string): HandlebarsTemplateDelegate {
        // handlebars escapes ' to &#x27; by default
        return this.handlebars.compile(source, { noEscape: true, strict: true });
    }
}
