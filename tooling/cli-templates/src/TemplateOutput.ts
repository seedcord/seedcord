import { join } from 'node:path';

import Handlebars from 'handlebars';

import { CLI_HELPERS } from './helpers';
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

export class TemplateOutput {
    private readonly handlebars = Handlebars.create();

    constructor(
        private readonly files: readonly TemplateFile[],
        private readonly name: string,
        private readonly project: RenderProject
    ) {
        this.handlebars.registerHelper(CLI_HELPERS);
        this.handlebars.registerHelper(project.helpers);
    }

    public render(answers: JsonObject): RenderedFile[] {
        const asked = { ...answers, name: this.name };
        return this.files.map((file) => {
            const path = join(this.project.root, this.compile(file.layout)(asked));
            const context = { ...asked, ...cliVariables({ project: this.project, path }) };
            return { path, contents: this.compile(file.source)(context) };
        });
    }

    private compile(source: string): HandlebarsTemplateDelegate {
        // handlebars escapes ' to &#x27; by default
        return this.handlebars.compile(source, { noEscape: true, strict: true });
    }
}
