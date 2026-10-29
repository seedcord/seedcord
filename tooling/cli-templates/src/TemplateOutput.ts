import { dirname, join, posix } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { importSpecifier } from '@seedcord/utils/internal';
import Handlebars from 'handlebars';

import { CLI_HELPER_NAMES, FILLED, IMPORT_OF } from './helperNames';
import { CLI_HELPERS } from './helpers';
import { inputsOf } from './inputsOf';
import { inTemplateFile } from './inTemplateFile';
import { splitName } from './splitName';
import { cliVariables } from './variables';

import type { TemplateHelper } from './helperNames';
import type { TemplateInputs } from './inputsOf';
import type { Template, TemplateFile } from './Template';
import type { Runtime } from '@seedcord/core/internal';
import type { TransportPackage } from '@seedcord/types/internal';
import type { JsonObject } from 'type-fest';

export interface RenderProject {
    readonly root: string;
    readonly transport: TransportPackage;
    readonly runtime: Runtime;
    readonly helpers: Readonly<Record<string, TemplateHelper>>;
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
        private readonly template: Template,
        nameWithFolder: string,
        private readonly project: RenderProject
    ) {
        const { folder, name } = splitName(nameWithFolder);
        this.name = name;
        this.handlebars.registerHelper(CLI_HELPERS);
        // justified: handlebars types every helper argument as any
        this.handlebars.registerHelper(project.helpers as Handlebars.HelperDeclareSpec);
        this.handlebars.registerPartial(
            Object.fromEntries([...template.partials].map(([partial, file]) => [partial, file.source]))
        );
        this.targets = template.files.map((file) => ({
            file,
            path: join(
                project.root,
                posix.dirname(file.layout),
                folder,
                this.renderText(file, posix.basename(file.layout), { name: this.name })
            )
        }));
        this.assertDistinctPaths();
    }

    public get paths(): string[] {
        return this.targets.map(({ path }) => path);
    }

    public inputs(): TemplateInputs {
        const helpers = new Set([...CLI_HELPER_NAMES, ...Object.keys(this.project.helpers)]);
        const inputs = inputsOf(this.template, helpers);
        return Object.fromEntries(Object.entries(inputs).filter(([key]) => !FILLED.has(key)));
    }

    public render(answers: JsonObject): RenderedFile[] {
        return this.targets.map(({ file, path }) => {
            const context = { ...answers, name: this.name, ...cliVariables(this.project, path) };
            const importOf = (folder: string): string => importSpecifier(dirname(path), this.onlyPathIn(folder));
            return {
                path,
                contents: this.renderText(file, file.source, context, { helpers: { [IMPORT_OF]: importOf } })
            };
        });
    }

    // macOS and Windows file systems ignore case by default
    private assertDistinctPaths(): void {
        const seen = new Set<string>();
        for (const { path } of this.targets) {
            const key = path.toLowerCase();
            if (seen.has(key)) throw new SeedcordError(SeedcordErrorCode.MakePathTaken, [path, this.template.name]);
            seen.add(key);
        }
    }

    private onlyPathIn(folder: string): string {
        const inFolder = this.targets.filter(({ file }) => posix.dirname(file.layout) === folder);
        const [only] = inFolder;
        if (!only || inFolder.length > 1) {
            throw new SeedcordTypeError(SeedcordErrorCode.MakeImportOfUnmatched, [
                this.template.name,
                folder,
                inFolder.length
            ]);
        }
        return only.path;
    }

    private renderText(file: TemplateFile, text: string, context: object, options?: Handlebars.RuntimeOptions): string {
        return inTemplateFile(this.template, file, () =>
            // handlebars escapes ' to &#x27; by default
            this.handlebars.compile(text, { noEscape: true, strict: true })(context, options)
        );
    }
}
